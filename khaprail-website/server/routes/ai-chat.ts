import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Request as ExpressRequest, Response as ExpressResponse } from "express"
import { sendFetchResponse, toFetchRequest } from "../lib/fetch-adapter.js"

// Express route handler for POST /api/ai-chat — proxies the Anthropic API.
// `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are server-only env
// vars, never sent to the browser; the client never talks to Anthropic
// directly. See .env.example for the full list of vars this needs.
//
// This was originally a Vercel Function written against the Web Fetch API
// handler signature (`Request` in, `Response` out) — ported here verbatim
// (same Anthropic calls, same rate-limiting, same request/response shapes)
// with only the outer glue swapped for Express via ../lib/fetch-adapter.ts,
// so nothing about the actual chat/summary behavior changed in the move
// off Vercel.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
const MODEL = "claude-haiku-4-5-20251001"
const CHAT_MAX_TOKENS = 300
const SUMMARY_MAX_TOKENS = 200
const RATE_LIMIT_PER_HOUR = 20
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
// Nothing in this function should ever hang past these — a stuck Supabase
// or Anthropic call previously caused the whole request to hang forever
// with no response, discovered by actually testing chat live in-browser.
const RATE_LIMIT_CHECK_TIMEOUT_MS = 5000
const ANTHROPIC_FETCH_TIMEOUT_MS = 45000
// A per-chunk ceiling on the Anthropic stream, found necessary by live
// testing: `AbortSignal.timeout()` on the initial fetch does not reliably
// abort an already-in-flight streamed body read if the upstream connection
// stalls after headers arrive — one live request sat at 0 bytes for 60s+
// with no error and no data. Bound every individual read() too, so a stall
// ends the response gracefully instead of leaving the client hanging.
const ANTHROPIC_STREAM_READ_TIMEOUT_MS = 20000
const STREAM_STALL_FALLBACK_TEXT =
  "Sorry, I'm having trouble responding right now — please try WhatsApp or the \"Get a Sample\" option on the site."
const SEARCH_PRODUCTS_MAX_RESULTS = 8
const SEARCH_PRODUCTS_DEFAULT_RESULTS = 4
const REFINE_CHIPS_LIMIT = 6

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    clearTimeout(timer!)
  }
}

// Shared, cacheable core instructions — identical across every request
// regardless of mode/page, so Anthropic's prompt caching (cache_control on
// this block) only bills full price for the first call in the cache
// window, not every summary/chat call. Real, always-true grounding rules
// only — the model is instructed to defer to WhatsApp/the sample flow for
// anything it wasn't actually given, and to use the search_products tool
// (real DB rows) rather than naming/describing any product from memory.
const STATIC_SYSTEM_PROMPT = `You are the AI assistant for Khaprail Tiles, a clay roof tile and terracotta tile manufacturer based in Lahore, Pakistan, established in 1982. You help website visitors understand real products and categories using only the factual data given to you in this conversation's context, or returned by the search_products tool — never invent specifications, prices, stock levels, delivery timelines, product names, category names, tile styles/profiles, or any other company fact you were not explicitly given.

Whenever a visitor wants tile recommendations, wants to browse, or asks what's available, call search_products instead of naming or describing any product from memory — the real matching products (with their real photos, prices, and links) are shown to the visitor automatically as cards, so you don't need to restate every detail, just introduce them briefly and naturally in a sentence or two. If search_products returns no results, say so honestly and suggest WhatsApp or a broader search instead of inventing a product to fill the gap.

Do not name a specific product, category, tile style, or profile in your own text unless it appears verbatim in the context given to you, or came back from a real search_products call. If you weren't given a real list of categories/products for this conversation and haven't searched yet, speak only in general terms about clay roof tiles and terracotta tiles.

If asked something you don't have real data for (exact delivery timelines, current stock, discounts, anything not listed in your context or search results), say so plainly and suggest contacting Khaprail Tiles via WhatsApp or the "Get a Sample" flow already on the site, rather than guessing or inventing an answer.

If a visitor expresses purchase intent (wanting to order, buy, or check out), do not attempt to complete a transaction yourself — point them to the existing "Get a Sample" WhatsApp flow.

Keep responses concise (a few sentences), warm, and specific to the real data given. Plain conversational text only — no markdown headers, no **bold**/*italic* asterisks, no heavy formatting; this renders as plain text in a small chat widget, not a markdown viewer.`

// Anthropic tool definition for grounded product recommendations — the
// backend executes the actual Supabase query and hands real rows back to
// the model (see executeSearchProducts); the model never fabricates a
// product. `finish`/`max_price` are wired to real columns/tables
// (`product_attributes`, `products.price`) even though neither has real
// data populated yet for any product — matching this project's standing
// "wire to the real table, don't fake it" rule (CLAUDE.md #2). Once
// Sylvester fills those in via /admin, this tool starts using them with no
// code change.
const SEARCH_PRODUCTS_TOOL = {
  name: "search_products",
  description:
    "Search Khaprail Tiles' real product catalog to find and recommend actual tiles. Always use this before recommending or naming any specific product — never invent or describe a product from memory. Returns real database rows, or an empty list if nothing matches (in which case tell the visitor honestly rather than inventing a result).",
  input_schema: {
    type: "object" as const,
    properties: {
      category: {
        type: "string",
        description: "A real Khaprail Tiles category name to filter by, if the visitor mentioned or implied one.",
      },
      query: {
        type: "string",
        description: "Free-text keywords to match against product names, if the visitor described what they want.",
      },
      finish: {
        type: "string",
        description: "A real finish/material attribute value to filter by, only if the visitor specified one.",
      },
      max_price: {
        type: "number",
        description: "Maximum price in PKR, only if the visitor gave a real budget.",
      },
      limit: {
        type: "number",
        description: `Max results to return (default ${SEARCH_PRODUCTS_DEFAULT_RESULTS}, max ${SEARCH_PRODUCTS_MAX_RESULTS}).`,
      },
    },
  },
  cache_control: { type: "ephemeral" as const },
}

interface ProductContext {
  name: string
  material?: string | null
  finish?: string | null
  size?: string | null
  thickness?: string | null
  country_of_origin?: string | null
  price?: number | null
  applications?: string[]
}

interface CategoryContext {
  name: string
  filters?: Record<string, string[]>
}

type ChatContext =
  | { type: "product"; product: ProductContext }
  | { type: "category"; category: CategoryContext }
  | { type: "general"; categoryNames?: string[] }

interface ChatRequestBody {
  mode: "summary" | "chat"
  product?: ProductContext
  context?: ChatContext
  messages?: { role: "user" | "assistant"; content: string }[]
  message?: string
  sessionId?: string
}

// Anthropic message content can be a plain string (ordinary turns) or a
// list of content blocks (needed for the tool_use/tool_result round-trip).
type AnthropicContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: string }

interface AnthropicMessage {
  role: "user" | "assistant"
  content: string | AnthropicContentBlock[]
}

interface ProductCardResult {
  name: string
  slug: string
  price: number | null
  cover_image_url: string | null
  category_name: string | null
}

function formatProductContext(product: ProductContext): string {
  const lines = [
    `Product name: ${product.name}`,
    product.material && `Material: ${product.material}`,
    product.finish && `Finish: ${product.finish}`,
    product.size && `Size: ${product.size}`,
    product.thickness && `Thickness: ${product.thickness}`,
    product.country_of_origin && `Country of origin: ${product.country_of_origin}`,
    product.price != null && `Price: PKR ${product.price.toLocaleString()}`,
    product.applications?.length && `Suitable for: ${product.applications.join(", ")}`,
  ].filter(Boolean)
  return lines.join("\n")
}

function buildDynamicSystemBlock(input: { mode: string; product?: ProductContext; context?: ChatContext }): string {
  if (input.mode === "summary" && input.product) {
    return `Here is the real data for the product you're summarizing:\n${formatProductContext(input.product)}\n\nWrite a concise, appealing 2-3 sentence summary for this product's detail page, using only the facts above. Do not invent details not listed. Do not mention that you are an AI or that this is a summary — just write the summary text itself.`
  }

  const ctx = input.context
  if (!ctx || ctx.type === "general") {
    const names = ctx?.type === "general" ? ctx.categoryNames : undefined
    return names?.length
      ? `The visitor is browsing the Khaprail Tiles website generally — no specific product or category page is open right now. These are Khaprail's real category names (the only ones you may reference by name outside of a search_products result): ${names.join(", ")}.`
      : "The visitor is browsing the Khaprail Tiles website generally — no specific product or category page is open right now, and no real category/product list was provided for this conversation. Do not name specific tile types, styles, or categories unless you get them from search_products."
  }
  if (ctx.type === "product") {
    return `The visitor is currently looking at this product page:\n${formatProductContext(ctx.product)}`
  }
  // category
  const filterLines = ctx.category.filters
    ? Object.entries(ctx.category.filters)
        .filter(([, values]) => values.length > 0)
        .map(([type, values]) => `- ${type}: ${values.join(", ")}`)
        .join("\n")
    : ""
  return `The visitor is currently browsing the "${ctx.category.name}" category page.${
    filterLines ? `\n\nReal filter values available on this page:\n${filterLines}` : ""
  }`
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  return forwarded?.split(",")[0]?.trim() || "unknown"
}

function getServiceClient(): SupabaseClient | null {
  const url = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null
  return createClient(url, serviceKey)
}

/**
 * Rate limiting is required, not optional (00-PROGRESS.md) — so if
 * `SUPABASE_SERVICE_ROLE_KEY` isn't configured yet, chat is refused
 * outright rather than silently allowed unlimited/unmetered (which would
 * defeat the entire point of the cap while looking like it worked).
 */
async function checkAndRecordRateLimit(client: SupabaseClient, sessionId: string, ip: string): Promise<boolean> {
  // Any failure here (network hiccup, bad key, slow Supabase) fails
  // closed — chat refused rather than silently unmetered — but never
  // hangs the whole request past `RATE_LIMIT_CHECK_TIMEOUT_MS`.
  try {
    return await withTimeout(
      (async () => {
        const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()
        const { count, error: countError } = await client
          .from("chat_usage")
          .select("*", { count: "exact", head: true })
          .eq("session_id", sessionId)
          .gte("created_at", since)

        if (countError) throw countError
        if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) return false

        await client.from("chat_usage").insert({ session_id: sessionId, ip_address: ip })
        return true
      })(),
      RATE_LIMIT_CHECK_TIMEOUT_MS,
      "Rate limit check"
    )
  } catch {
    return false
  }
}

async function verifyAdminToken(authHeader: string | null): Promise<boolean> {
  if (!authHeader?.startsWith("Bearer ")) return false
  const url = process.env.VITE_SUPABASE_URL
  const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !publishableKey) return false
  try {
    const client = createClient(url, publishableKey)
    const { data, error } = await withTimeout(
      client.auth.getUser(authHeader.slice("Bearer ".length)),
      RATE_LIMIT_CHECK_TIMEOUT_MS,
      "Admin token check"
    )
    return !error && !!data.user
  } catch {
    return false
  }
}

interface SearchProductsInput {
  category?: string
  query?: string
  finish?: string
  max_price?: number
  limit?: number
}

/**
 * Executes the model's `search_products` tool call against the real
 * `products`/`categories`/`product_attributes` tables — the only source of
 * product facts the model is allowed to present as cards. Returns an
 * honestly empty list (never a fabricated placeholder) when nothing
 * matches, including when `finish` is given but `product_attributes` has
 * no rows yet — see 00-PROGRESS.md, that table is real but currently empty.
 */
async function executeSearchProducts(input: SearchProductsInput, client: SupabaseClient | null): Promise<ProductCardResult[]> {
  if (!client) return []
  const limit = Math.min(Math.max(Math.trunc(input.limit ?? SEARCH_PRODUCTS_DEFAULT_RESULTS), 1), SEARCH_PRODUCTS_MAX_RESULTS)

  let categoryId: string | null = null
  if (input.category) {
    const { data: exact } = await client.from("categories").select("id").ilike("name", input.category).limit(1)
    categoryId = exact?.[0]?.id ?? null
    if (!categoryId) {
      const { data: fuzzy } = await client.from("categories").select("id").ilike("name", `%${input.category}%`).limit(1)
      categoryId = fuzzy?.[0]?.id ?? null
    }
  }

  let attributeProductIds: Set<string> | null = null
  if (input.finish) {
    const { data } = await client
      .from("product_attributes")
      .select("product_id")
      .in("attribute_type", ["Finish", "finish", "Material", "material"])
      .ilike("value", `%${input.finish}%`)
    attributeProductIds = new Set((data ?? []).map((row) => row.product_id as string))
    if (attributeProductIds.size === 0) return []
  }

  let query = client.from("products").select("id, name, slug, price, cover_image_url, category_id")
  if (categoryId) query = query.eq("category_id", categoryId)
  if (input.query) query = query.ilike("name", `%${input.query}%`)
  if (input.max_price != null) query = query.lte("price", input.max_price)
  if (attributeProductIds) query = query.in("id", [...attributeProductIds])
  query = query.order("created_at", { ascending: false }).limit(limit)

  const { data, error } = await query
  if (error || !data || data.length === 0) return []

  const categoryIds = [...new Set(data.map((p) => p.category_id).filter((id): id is string => !!id))]
  const categoryNames: Record<string, string> = {}
  if (categoryIds.length > 0) {
    const { data: cats } = await client.from("categories").select("id, name").in("id", categoryIds)
    for (const cat of cats ?? []) categoryNames[cat.id as string] = cat.name as string
  }

  return data.map((p) => ({
    name: p.name as string,
    slug: p.slug as string,
    price: (p.price as number | null) ?? null,
    cover_image_url: (p.cover_image_url as string | null) ?? null,
    category_name: p.category_id ? (categoryNames[p.category_id as string] ?? null) : null,
  }))
}

/**
 * Quick-refine chip labels — sourced only from the real, admin-editable
 * `filter_types` table (never hardcoded example values like "Non-slip").
 * That table has zero rows today (00-PROGRESS.md), so this honestly
 * returns an empty list and the client simply doesn't render a chip row
 * (no dead affordance) until Sylvester populates real filter values.
 */
async function buildRefineChips(client: SupabaseClient | null): Promise<string[]> {
  if (!client) return []
  const { data } = await client
    .from("filter_types")
    .select("value")
    .order("display_order", { ascending: true })
    .limit(REFINE_CHIPS_LIMIT)
  return (data ?? []).map((row) => row.value as string)
}

async function callAnthropic(options: {
  system: { type: "text"; text: string; cache_control?: { type: "ephemeral" } }[]
  messages: AnthropicMessage[]
  maxTokens: number
  stream: boolean
  tools?: unknown[]
}) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured on the server yet.")
  }

  // Bounds how long we wait for Anthropic to start responding (headers),
  // not the full streamed duration — `fetch()` resolves once the response
  // begins, before the body is fully read.
  return fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "prompt-caching-2024-07-31",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: options.maxTokens,
      system: options.system,
      messages: options.messages,
      stream: options.stream,
      ...(options.tools ? { tools: options.tools, tool_choice: { type: "auto" } } : {}),
    }),
    signal: AbortSignal.timeout(ANTHROPIC_FETCH_TIMEOUT_MS),
  })
}

interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
}

/**
 * Parses one Anthropic SSE response, yielding text deltas as they arrive
 * (for the client's typing effect) and returning the accumulated tool call
 * (if the model decided to call one) plus the stop reason once the stream
 * ends. Every individual `read()` is bounded by `ANTHROPIC_STREAM_READ_TIMEOUT_MS`
 * — a stall is treated as end-of-stream rather than hanging (see the
 * `streamAnthropicText`-era bug notes below and 00-PROGRESS.md).
 */
async function* consumeAnthropicStream(
  response: Response
): AsyncGenerator<{ type: "text"; text: string }, { toolCall: ToolCall | null; stopReason: string | null }> {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let toolAcc: { id: string; name: string; partialJson: string } | null = null
  let finishedToolCall: ToolCall | null = null
  let stopReason: string | null = null

  while (true) {
    let done: boolean, value: Uint8Array | undefined
    try {
      ;({ done, value } = await withTimeout(reader.read(), ANTHROPIC_STREAM_READ_TIMEOUT_MS, "Anthropic stream read"))
    } catch {
      break
    }
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue
      const payload = line.slice(6).trim()
      if (!payload || payload === "[DONE]") continue
      let event: any
      try {
        event = JSON.parse(payload)
      } catch {
        continue
      }
      if (event.type === "content_block_start" && event.content_block?.type === "tool_use") {
        toolAcc = { id: event.content_block.id, name: event.content_block.name, partialJson: "" }
      } else if (event.type === "content_block_delta") {
        if (event.delta?.type === "text_delta") {
          yield { type: "text", text: event.delta.text as string }
        } else if (event.delta?.type === "input_json_delta" && toolAcc) {
          toolAcc.partialJson += event.delta.partial_json ?? ""
        }
      } else if (event.type === "content_block_stop" && toolAcc) {
        try {
          finishedToolCall = {
            id: toolAcc.id,
            name: toolAcc.name,
            input: toolAcc.partialJson ? JSON.parse(toolAcc.partialJson) : {},
          }
        } catch {
          finishedToolCall = { id: toolAcc.id, name: toolAcc.name, input: {} }
        }
        toolAcc = null
      } else if (event.type === "message_delta" && event.delta?.stop_reason) {
        stopReason = event.delta.stop_reason
      } else if (event.type === "message_stop") {
        void reader.cancel()
        return { toolCall: finishedToolCall, stopReason }
      }
    }
  }
  void reader.cancel()
  return { toolCall: finishedToolCall, stopReason }
}

function iterableToStream(iterable: AsyncGenerator<Uint8Array>): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { value, done } = await iterable.next()
      if (done) {
        controller.close()
        return
      }
      controller.enqueue(value)
    },
    async cancel() {
      await iterable.return(undefined)
    },
  })
}

// Structured payload (real product cards + real quick-refine chips) is
// appended after this delimiter once the assistant's prose has finished
// streaming — NUL never appears in real model text, so the client can
// split on it unambiguously regardless of chunk boundaries. See
// `ai-chat-client.ts`'s `streamChatReply`.
const DATA_DELIMITER = String.fromCharCode(0)

/**
 * Drives one full chat turn: streams the model's first response (which may
 * include a `search_products` tool call), executes that tool for real if
 * called, streams the model's follow-up reply grounded in the real
 * results, then appends the structured product-card/chip payload. A plain
 * (no-tool-call) turn just streams straight through with no payload.
 */
async function* driveChatTurn(opts: {
  system: { type: "text"; text: string; cache_control?: { type: "ephemeral" } }[]
  messages: AnthropicMessage[]
  maxTokens: number
  firstResponse: Response
  supabaseClient: SupabaseClient | null
}): AsyncGenerator<Uint8Array> {
  const encoder = new TextEncoder()
  const gen1 = consumeAnthropicStream(opts.firstResponse)
  let sentAny = false
  let step = await gen1.next()
  while (!step.done) {
    sentAny = true
    yield encoder.encode(step.value.text)
    step = await gen1.next()
  }
  const { toolCall } = step.value

  if (!toolCall || toolCall.name !== "search_products") {
    if (!sentAny) yield encoder.encode(STREAM_STALL_FALLBACK_TEXT)
    return
  }

  const [products, chips] = await Promise.all([
    executeSearchProducts(toolCall.input as SearchProductsInput, opts.supabaseClient),
    buildRefineChips(opts.supabaseClient),
  ])

  const followUpMessages: AnthropicMessage[] = [
    ...opts.messages,
    { role: "assistant", content: [{ type: "tool_use", id: toolCall.id, name: toolCall.name, input: toolCall.input }] },
    {
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: toolCall.id,
          content: JSON.stringify({ count: products.length, products }),
        },
      ],
    },
  ]

  let secondSentAny = false
  try {
    const secondResponse = await callAnthropic({
      system: opts.system,
      messages: followUpMessages,
      maxTokens: opts.maxTokens,
      stream: true,
      // No `tools` here — this call's only job is to produce the final
      // grounded prose reply from the real tool result, not to search again.
    })
    if (secondResponse.ok && secondResponse.body) {
      const gen2 = consumeAnthropicStream(secondResponse)
      let step2 = await gen2.next()
      while (!step2.done) {
        secondSentAny = true
        yield encoder.encode(step2.value.text)
        step2 = await gen2.next()
      }
    }
  } catch {
    // fall through — the fallback line below covers a failed follow-up call
  }
  if (!secondSentAny) {
    yield encoder.encode(
      products.length > 0
        ? "Here's what I found:"
        : "I couldn't find any real matches for that in our catalog right now — try WhatsApp or a broader search."
    )
  }

  if (products.length > 0 || chips.length > 0) {
    yield encoder.encode(DATA_DELIMITER + JSON.stringify({ products, chips }))
  }
}

async function handleRequest(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ error: "method_not_allowed" }, { status: 405 })
  }

  let body: ChatRequestBody
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 })
  }

  const staticBlock = { type: "text" as const, text: STATIC_SYSTEM_PROMPT, cache_control: { type: "ephemeral" as const } }

  if (body.mode === "summary") {
    const isAdmin = await verifyAdminToken(request.headers.get("authorization"))
    if (!isAdmin) {
      return Response.json({ error: "unauthorized" }, { status: 401 })
    }
    if (!body.product?.name) {
      return Response.json({ error: "missing_product" }, { status: 400 })
    }

    const dynamicBlock = { type: "text" as const, text: buildDynamicSystemBlock({ mode: "summary", product: body.product }) }

    try {
      const response = await callAnthropic({
        system: [staticBlock, dynamicBlock],
        messages: [{ role: "user", content: "Write the summary now." }],
        maxTokens: SUMMARY_MAX_TOKENS,
        stream: false,
      })
      if (!response.ok) {
        const detail = await response.text()
        return Response.json({ error: "anthropic_error", detail }, { status: 502 })
      }
      const data = await response.json()
      const summary = data.content?.[0]?.type === "text" ? data.content[0].text.trim() : ""
      return Response.json({ summary })
    } catch (err) {
      return Response.json({ error: "server_error", detail: (err as Error).message }, { status: 500 })
    }
  }

  if (body.mode === "chat") {
    const sessionId = body.sessionId
    if (!sessionId) {
      return Response.json({ error: "missing_session" }, { status: 400 })
    }
    const serviceClient = getServiceClient()
    if (!serviceClient) {
      return Response.json(
        { error: "not_configured", message: "The AI assistant isn't fully set up yet — please use WhatsApp instead." },
        { status: 503 }
      )
    }
    const ip = getClientIp(request)

    const allowed = await checkAndRecordRateLimit(serviceClient, sessionId, ip)
    if (!allowed) {
      return Response.json(
        {
          error: "rate_limited",
          message: "You've reached the chat limit for now — try again in a bit, or reach us on WhatsApp.",
        },
        { status: 429 }
      )
    }

    if (!body.message) {
      return Response.json({ error: "missing_message" }, { status: 400 })
    }

    const dynamicBlock = { type: "text" as const, text: buildDynamicSystemBlock({ mode: "chat", context: body.context }) }
    const system = [staticBlock, dynamicBlock]
    const history: AnthropicMessage[] = (body.messages ?? []).slice(-20)
    const messages: AnthropicMessage[] = [...history, { role: "user", content: body.message }]

    try {
      const response = await callAnthropic({
        system,
        messages,
        maxTokens: CHAT_MAX_TOKENS,
        stream: true,
        tools: [SEARCH_PRODUCTS_TOOL],
      })
      if (!response.ok || !response.body) {
        const detail = await response.text()
        return Response.json({ error: "anthropic_error", detail }, { status: 502 })
      }
      return new Response(
        iterableToStream(
          driveChatTurn({ system, messages, maxTokens: CHAT_MAX_TOKENS, firstResponse: response, supabaseClient: serviceClient })
        ),
        { headers: { "content-type": "text/plain; charset=utf-8" } }
      )
    } catch (err) {
      return Response.json({ error: "server_error", detail: (err as Error).message }, { status: 500 })
    }
  }

  return Response.json({ error: "invalid_mode" }, { status: 400 })
}

// Wraps every request in a top-level try/catch — a hang or uncaught throw
// anywhere in handleRequest would otherwise leave the client waiting
// forever with no response at all.
async function handleAiChatFetch(request: Request): Promise<Response> {
  try {
    return await handleRequest(request)
  } catch (err) {
    return Response.json({ error: "unhandled_error", detail: (err as Error).message }, { status: 500 })
  }
}

export async function aiChatHandler(req: ExpressRequest, res: ExpressResponse): Promise<void> {
  const fetchResponse = await handleAiChatFetch(toFetchRequest(req))
  await sendFetchResponse(fetchResponse, res)
}

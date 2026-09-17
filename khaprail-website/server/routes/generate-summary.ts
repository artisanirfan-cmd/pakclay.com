import { createClient } from "@supabase/supabase-js"
import type { Request as ExpressRequest, Response as ExpressResponse } from "express"
import { sendFetchResponse, toFetchRequest } from "../lib/fetch-adapter.js"

// Express route handler for POST /api/ai/generate-summary.
// Admin-only endpoint: generates a static product summary using Claude Haiku,
// grounded in real product data. The summary is written to the DB by the admin
// form save — customer page views never trigger this endpoint.
//
// Ported verbatim from the original Vercel Function (Web Fetch API handler
// signature) — see server/routes/ai-chat.ts for the same porting note.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
const MODEL = "claude-haiku-4-5-20251001"
const MAX_TOKENS = 200
const TIMEOUT_MS = 30000

type SummaryTone = "architectural" | "commercial" | "minimal"

interface RequestBody {
  name: string
  category?: string | null
  finish?: string | null
  size?: string | null
  thickness?: string | null
  country_of_origin?: string | null
  price?: number | null
  material?: string | null
  applications?: string[]
  tone?: SummaryTone
}

const TONE_INSTRUCTIONS: Record<SummaryTone, string> = {
  architectural:
    "Write in a technical, material-focused tone. Emphasise craft, durability, climate resilience, and architectural heritage. Reference Pakistani building traditions where relevant.",
  commercial:
    "Write in a sales-driven, benefit-led tone. Highlight value proposition, versatility, and appeal to contractors and homeowners. Use persuasive but honest language.",
  minimal:
    "Write in a clean, understated tone. Short sentences. Focus on essential facts only — material, size, finish. No flourishes or marketing language.",
}

const BRAND_GROUNDING = `You write product descriptions for Khaprail Tiles, a clay roof tile and terracotta tile manufacturer based in Lahore, Pakistan, established in 1982. Their products serve the Pakistani architectural market — residential, commercial, and heritage restoration.

Rules:
- Use ONLY the facts provided. Never invent specifications, prices, stock, or delivery timelines.
- Target 60-90 words. Concise, high-converting copy for a product detail page.
- No markdown, no headers, no bullet points — plain prose only.
- Do not mention that this is AI-generated or that you are an assistant.
- Reference Khaprail's 40+ year heritage and Pakistani clay traditions when the tone allows.
- Mention climate suitability (monsoon resilience, thermal performance) only if the data supports it.`

function formatProductFacts(body: RequestBody): string {
  const lines = [
    `Product: ${body.name}`,
    body.category && `Category: ${body.category}`,
    body.material && `Material: ${body.material}`,
    body.finish && `Finish: ${body.finish}`,
    body.size && `Dimensions: ${body.size}`,
    body.thickness && `Thickness: ${body.thickness}`,
    body.country_of_origin && `Origin: ${body.country_of_origin}`,
    body.price != null && `Price: PKR ${body.price.toLocaleString()}`,
    body.applications?.length && `Applications: ${body.applications.join(", ")}`,
  ].filter(Boolean)
  return lines.join("\n")
}

async function verifyAdminToken(authHeader: string | null): Promise<boolean> {
  if (!authHeader?.startsWith("Bearer ")) return false
  const url = process.env.VITE_SUPABASE_URL
  const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !publishableKey) return false
  try {
    const client = createClient(url, publishableKey)
    const { data, error } = await Promise.race([
      client.auth.getUser(authHeader.slice("Bearer ".length)),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
    ])
    return !error && !!data?.user
  } catch {
    return false
  }
}

async function handleGenerateSummaryFetch(request: Request): Promise<Response> {
  try {
    if (request.method !== "POST") {
      return Response.json({ error: "method_not_allowed" }, { status: 405 })
    }

    const isAdmin = await verifyAdminToken(request.headers.get("authorization"))
    if (!isAdmin) {
      return Response.json({ error: "unauthorized" }, { status: 401 })
    }

    let body: RequestBody
    try {
      body = await request.json()
    } catch {
      return Response.json({ error: "invalid_json" }, { status: 400 })
    }

    if (!body.name?.trim()) {
      return Response.json({ error: "missing_name" }, { status: 400 })
    }

    const tone: SummaryTone = body.tone ?? "architectural"
    const facts = formatProductFacts(body)

    const systemPrompt = `${BRAND_GROUNDING}\n\n${TONE_INSTRUCTIONS[tone]}\n\nProduct data:\n${facts}\n\nWrite the summary now.`

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return Response.json(
        { error: "server_config", message: "ANTHROPIC_API_KEY is not configured." },
        { status: 503 }
      )
    }

    const response = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: [{ type: "text", text: systemPrompt }],
        messages: [{ role: "user", content: "Generate the product summary." }],
        stream: false,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })

    if (!response.ok) {
      const detail = await response.text()
      return Response.json({ error: "anthropic_error", detail }, { status: 502 })
    }

    const data = await response.json()
    const summary =
      data.content?.[0]?.type === "text" ? data.content[0].text.trim() : ""

    return Response.json({ summary })
  } catch (err) {
    return Response.json(
      { error: "server_error", detail: (err as Error).message },
      { status: 500 }
    )
  }
}

export async function generateSummaryHandler(req: ExpressRequest, res: ExpressResponse): Promise<void> {
  const fetchResponse = await handleGenerateSummaryFetch(toFetchRequest(req))
  await sendFetchResponse(fetchResponse, res)
}

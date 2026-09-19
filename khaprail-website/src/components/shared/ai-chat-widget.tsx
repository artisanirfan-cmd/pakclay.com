import { useEffect, useRef, useState, type FormEvent } from "react"
import { useMatch } from "react-router-dom"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { XIcon, SendIcon, SparklesIcon, SearchIcon, RotateCcwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useProduct } from "@/hooks/use-product"
import { useCategory } from "@/hooks/use-category"
import { useCategories } from "@/hooks/use-categories"
import { useFilterTypes } from "@/hooks/use-filter-types"
import { AiChatProductCard } from "@/components/shared/ai-chat-product-card"
import {
  streamChatReply,
  ChatRateLimitError,
  type ChatAiContext,
  type ChatHistoryMessage,
  type ChatProductCard,
} from "@/lib/ai-chat-client"
import { useChatPanel } from "@/lib/chat-panel-context"
import { cn } from "@/lib/utils"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  /** A locally-shown notice (rate limit / error) — never sent to the API as conversation history. */
  isNotice?: boolean
  /** Real `search_products` results for this turn, if any (api/ai-chat.ts) — never model-generated. */
  products?: ChatProductCard[]
  /** Real `filter_types` values for this turn, if any — empty until Sylvester populates that table. */
  chips?: string[]
}

// Defense-in-depth: the system prompt tells the model not to use markdown
// emphasis (this is a plain-text bubble, not a markdown renderer), but a
// live model call still slipped in **bold** once. Stripped at render time
// (not when appending streamed chunks) so a `**` pair split across two
// stream chunks can't leave a stray single asterisk on screen.
function stripMarkdownEmphasis(text: string): string {
  return text.replace(/\*\*/g, "")
}

function makeGreeting(): ChatMessage {
  return {
    id: "greeting",
    role: "assistant",
    content: "Hi! I'm the Khaprail Tiles assistant. Ask me about our tiles, or tell me what you're looking for.",
  }
}

const GREETING_BUBBLE_DELAY_MS = 8000
const GREETING_BUBBLE_DISMISSED_KEY = "khaprail-chat-greeting-dismissed"

// Terracotta-circle + sparkle "AI touchpoint" mark, shared between the
// trigger button and every assistant message avatar so the two read as one
// system (per the request's explicit ask), and matching the PDP AI summary
// card's icon/treatment (ai-summary-card.tsx).
function AiBrandMark({ className }: { className?: string }) {
  return (
    <div className={cn("flex shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground", className)}>
      <SparklesIcon className="size-4" />
    </div>
  )
}

// Site-wide floating chat widget (every page) — a shopping-assistant panel,
// not a small popover. Bottom-right trigger, stacked directly above the
// desktop floating WhatsApp button (same corner, small gap — never
// overlapping it) since that's the anchor corner this site already commits
// to for floating CTAs; on mobile that WhatsApp button is hidden (the tab
// bar's own elevated "Get a Sample" button, centered, does that job there),
// so the trigger just sits bottom-right above the tab bar. Grounds every
// reply in real page context (`buildContext()`) and real `search_products`
// tool results (api/ai-chat.ts) — never calls Anthropic directly from the
// browser.
export function AiChatWidget() {
  const { isOpen, open: openPanel, close: closePanel } = useChatPanel()
  const [messages, setMessages] = useState<ChatMessage[]>(() => [makeGreeting()])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [showGreetingBubble, setShowGreetingBubble] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const triggerAreaRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()

  const productMatch = useMatch("/products/:slug")
  const categoryMatch = useMatch("/categories/:slug")
  const { product } = useProduct(productMatch?.params.slug)
  const { category } = useCategory(categoryMatch?.params.slug)
  const { filterGroups } = useFilterTypes()
  const { categories } = useCategories()

  function dismissGreetingBubble() {
    setShowGreetingBubble(false)
    try {
      sessionStorage.setItem(GREETING_BUBBLE_DISMISSED_KEY, "1")
    } catch {
      // Storage unavailable — the bubble just won't persist its dismissal
      // across a reload this session, not worth failing over.
    }
  }

  // Shows the "Need help finding a tile?" bubble once, after the visitor
  // has been browsing a while — never again this session once dismissed
  // (click X, click elsewhere, or open the chat), per the request.
  useEffect(() => {
    if (isOpen) return
    let alreadyDismissed = false
    try {
      alreadyDismissed = sessionStorage.getItem(GREETING_BUBBLE_DISMISSED_KEY) === "1"
    } catch {
      // Treat as not-dismissed — worst case the bubble shows once more.
    }
    if (alreadyDismissed) return
    const timer = setTimeout(() => setShowGreetingBubble(true), GREETING_BUBBLE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [isOpen])

  useEffect(() => {
    if (!showGreetingBubble) return
    function handlePointerDown(event: PointerEvent) {
      if (triggerAreaRef.current?.contains(event.target as Node)) return
      dismissGreetingBubble()
    }
    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [showGreetingBubble])

  // Regressed to a static string during the batch-29 panel rebuild — restores
  // the documented page-context-aware copy (00-PROGRESS.md batch 28) using
  // the exact same PDP-detection signal `buildContext()` uses below, so the
  // two can't drift independently again (UX_AUDIT_REPORT.md finding 14 / 1.9).
  const chatPlaceholder = productMatch && product ? "Ask about this product…" : "Ask about tiles..."

  function buildContext(): ChatAiContext {
    if (productMatch && product) {
      const material = product.product_attributes.find((a) => a.attribute_type.toLowerCase() === "material")?.value
      const applications = product.product_attributes
        .filter((a) => a.attribute_type.toLowerCase() === "application")
        .map((a) => a.value)
      return {
        type: "product",
        product: {
          name: product.name,
          material,
          finish: product.finish,
          size: product.size,
          thickness: product.thickness,
          country_of_origin: product.country_of_origin,
          price: product.price,
          applications,
        },
      }
    }
    if (categoryMatch && category) {
      const filters = Object.fromEntries(
        Object.entries(filterGroups).map(([type, options]) => [type, options.map((o) => o.value)])
      )
      return { type: "category", category: { name: category.name, filters } }
    }
    return { type: "general", categoryNames: categories.map((c) => c.name) }
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" })
    })
  }

  async function sendMessage(rawText: string) {
    const text = rawText.trim()
    if (!text || isStreaming) return

    const history: ChatHistoryMessage[] = messages
      .filter((m) => !m.isNotice)
      .map((m) => ({ role: m.role, content: m.content }))

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text }
    const assistantId = crypto.randomUUID()
    setMessages((prev) => [...prev, userMessage, { id: assistantId, role: "assistant", content: "" }])
    setInput("")
    setIsStreaming(true)
    scrollToBottom()

    try {
      const { products, chips } = await streamChatReply({ message: text, history, context: buildContext() }, (chunk) => {
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)))
        scrollToBottom()
      })
      if (products.length > 0 || chips.length > 0) {
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, products, chips } : m)))
        scrollToBottom()
      }
    } catch (err) {
      const message =
        err instanceof ChatRateLimitError
          ? err.message
          : "The AI assistant is temporarily unavailable — try WhatsApp instead."
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: message, isNotice: true } : m)))
    } finally {
      setIsStreaming(false)
      scrollToBottom()
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    void sendMessage(input)
  }

  function handleOpen() {
    openPanel()
    dismissGreetingBubble()
  }

  function handleReset() {
    setMessages([makeGreeting()])
    setInput("")
  }

  return (
    <>
      {!isOpen && (
        <div
          ref={triggerAreaRef}
          className="fixed right-5 z-40 flex flex-col items-end gap-2 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] lg:bottom-[calc(max(1.25rem,calc(env(safe-area-inset-bottom)+1rem))+4.25rem)]"
        >
          {showGreetingBubble && (
            <div className="animate-in fade-in slide-in-from-bottom-2 relative max-w-56 rounded-2xl rounded-br-sm border border-border bg-popover p-3 text-sm text-foreground shadow-lg duration-200">
              <button
                type="button"
                onClick={dismissGreetingBubble}
                aria-label="Dismiss"
                className="absolute -top-2 -left-2 flex size-5 items-center justify-center rounded-full bg-muted text-muted-foreground shadow outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <XIcon className="size-3" />
              </button>
              Need help finding a tile?
            </div>
          )}
          <button
            type="button"
            onClick={handleOpen}
            aria-label="Chat with Khaprail Tiles AI assistant"
            aria-expanded={isOpen}
            className="relative flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform outline-none hover:scale-105 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95"
          >
            {!prefersReducedMotion && (
              <span className="chat-pulse-ring absolute inset-0 rounded-full bg-primary" aria-hidden="true" />
            )}
            <SparklesIcon className="relative size-6" />
          </button>
        </div>
      )}

      {isOpen && (
        <div
          role="dialog"
          aria-label="Khaprail Tiles AI assistant"
          // Mobile: a true full-screen takeover (`inset-0` + `h-dvh`, not
          // `bottom-0 h-[88vh]`) — `vh` units on mobile browsers are sized
          // against the *largest* possible viewport (chrome collapsed), not
          // the currently-visible one, so with the address bar shown the
          // real visible height is shorter than `88vh` computes to; the
          // panel's bottom (the input row) was rendering below the actual
          // visible screen. `dvh` tracks the real visible viewport instead.
          // Full-screen also means it fully covers the site header instead
          // of a short floating card whose top edge landed inside it.
          // Desktop (`lg:`) keeps the original floating-card behavior,
          // anchored bottom-right above the WhatsApp button.
          className="animate-in fade-in slide-in-from-bottom-4 fixed inset-0 z-40 flex h-dvh flex-col overflow-hidden bg-popover shadow-2xl duration-200 lg:inset-auto lg:bottom-[calc(max(1.25rem,calc(env(safe-area-inset-bottom)+1rem))+4.25rem)] lg:right-5 lg:h-[min(70vh,640px)] lg:w-[420px] lg:rounded-2xl lg:border lg:border-border"
        >
          <div
            className="flex shrink-0 items-center gap-2 border-b border-border p-3"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
          >
            <AiBrandMark className="size-8" />
            <span className="font-heading text-sm font-semibold">Khaprail Assistant</span>
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={handleReset}
                aria-label="Start a new conversation"
                className="flex size-11 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <RotateCcwIcon className="size-4" />
              </button>
              <button
                type="button"
                onClick={closePanel}
                aria-label="Close chat"
                className="flex size-11 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <XIcon className="size-4" />
              </button>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 px-3 pt-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">Today</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* The only flexible row — header/divider/input are all `shrink-0`
              (fixed height), so this is the one that grows/shrinks to fill
              whatever space is left and scrolls independently. */}
          <div ref={listRef} className="scrollbar-fade flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
            {messages.map((m) => (
              <div key={m.id} className={cn("flex flex-col gap-2", m.role === "user" ? "items-end" : "items-start")}>
                <div className={cn("flex max-w-[90%] items-end gap-2", m.role === "user" && "flex-row-reverse")}>
                  {m.role === "assistant" && <AiBrandMark className="mb-0.5 size-7" />}
                  <div
                    className={cn(
                      "rounded-xl px-3 py-2 text-sm whitespace-pre-wrap",
                      m.role === "user"
                        ? "bg-secondary text-secondary-foreground"
                        : m.isNotice
                          ? "bg-destructive/10 text-destructive"
                          : "bg-muted text-foreground"
                    )}
                  >
                    {(m.content && stripMarkdownEmphasis(m.content)) || (isStreaming && m.role === "assistant" ? "…" : "")}
                  </div>
                </div>

                {m.products && m.products.length > 0 && (
                  <div className="scrollbar-fade flex w-full gap-2 overflow-x-auto pb-1 pl-9">
                    {m.products.map((p) => (
                      <AiChatProductCard key={p.slug} product={p} />
                    ))}
                  </div>
                )}

                {m.chips && m.chips.length > 0 && (
                  <div className="flex w-full flex-wrap gap-1.5 pl-9">
                    {m.chips.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        disabled={isStreaming}
                        onClick={() => void sendMessage(chip)}
                        className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex shrink-0 items-center gap-2 border-t border-border p-3"
            style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
          >
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={chatPlaceholder}
                disabled={isStreaming}
                className="h-11 w-full rounded-full border border-border bg-background pr-4 pl-9 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
              />
            </div>
            <Button type="submit" size="icon" className="size-11 shrink-0 rounded-full" disabled={isStreaming || !input.trim()}>
              <SendIcon className="size-4" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </div>
      )}
    </>
  )
}

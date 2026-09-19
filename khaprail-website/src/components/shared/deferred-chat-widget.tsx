import { lazy, Suspense, useEffect, useState } from "react"
import { useChatPanel } from "@/lib/chat-panel-context"

// The AI chat widget (markdown-ish message rendering, streaming client,
// session handling) is not needed to read a page, so it is code-split out of
// the main bundle and mounted once the browser is idle — or immediately if a
// visitor opens the chat panel from the navbar / mobile tab bar first (that
// state lives in ChatPanelProvider, which stays in the main bundle, so the
// panel simply appears open as soon as the chunk arrives).
const AiChatWidget = lazy(() =>
  import("@/components/shared/ai-chat-widget").then((m) => ({ default: m.AiChatWidget })),
)

export function DeferredChatWidget() {
  const { isOpen } = useChatPanel()
  const [idle, setIdle] = useState(false)

  useEffect(() => {
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => setIdle(true), { timeout: 4000 })
      return () => window.cancelIdleCallback(id)
    }
    const id = window.setTimeout(() => setIdle(true), 2500)
    return () => window.clearTimeout(id)
  }, [])

  if (!idle && !isOpen) return null
  return (
    <Suspense fallback={null}>
      <AiChatWidget />
    </Suspense>
  )
}

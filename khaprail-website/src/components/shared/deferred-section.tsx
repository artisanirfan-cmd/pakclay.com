import { useEffect, useRef, useState, type ReactNode } from "react"

// Why this exists (Lighthouse mobile: TBT 780ms, 17 long tasks, LCP 5.4s):
// the homepage used to render all ~14 sections in ONE synchronous React
// commit — hundreds of components, a Base UI Tabs list that measures every
// element (forced style recalculation), ~25 data fetches all resolving into
// re-renders. That single ~600ms task (4x-throttled mobile CPU) sits between
// "the prerendered hero is on screen" and "the browser can paint the re-created
// hero", so it directly delayed LCP and inflated TBT.
//
// A DeferredSection renders nothing but a spacer until either
//   1. it scrolls within `rootMargin` of the viewport (IntersectionObserver), or
//   2. its turn comes in a shared idle queue that mounts ONE section at a time,
//      each in its own task with a gap between them.
// (2) matters as much as (1): every section still ends up in the DOM a moment
// after load without any scrolling, so crawlers, find-in-page and anchor links
// get the complete page, and no single task is long enough to count as blocking.

const IDLE_GAP_MS = 120

type Job = () => void
const queue: Job[] = []
let pumping = false

function whenIdle(callback: () => void) {
  if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(callback, { timeout: 1500 })
  else window.setTimeout(callback, 200)
}

function pump() {
  if (pumping) return
  pumping = true
  const step = () => {
    const job = queue.shift()
    if (!job) {
      pumping = false
      return
    }
    job()
    // Leave a gap so React can commit the section that was just revealed (and
    // the browser can paint / handle input) before the next one starts.
    window.setTimeout(() => whenIdle(step), IDLE_GAP_MS)
  }
  // First section only after the page has had a chance to paint its hero.
  window.setTimeout(() => whenIdle(step), 300)
}

function enqueue(job: Job): () => void {
  queue.push(job)
  pump()
  return () => {
    const index = queue.indexOf(job)
    if (index !== -1) queue.splice(index, 1)
  }
}

// Number of mounted sections that have not rendered their content yet. The
// build-time prerender (scripts/prerender.mjs) waits for this to reach 0 so it
// never snapshots a half-mounted page.
type PendingWindow = Window & { __deferredPending?: number }
function adjustPending(delta: number) {
  const w = window as PendingWindow
  w.__deferredPending = Math.max(0, (w.__deferredPending ?? 0) + delta)
}

interface DeferredSectionProps {
  children: ReactNode
  /** Reserved height while unmounted (real section heights vary 350-2250px by viewport, so this is only a rough placeholder for the scrollbar). */
  minHeight?: number
  /** How far outside the viewport a section starts rendering (IntersectionObserver rootMargin). */
  rootMargin?: string
}

export function DeferredSection({ children, minHeight = 400, rootMargin = "700px 0px" }: DeferredSectionProps) {
  const [ready, setReady] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ready) return
    const reveal = () => setReady(true)
    adjustPending(1)
    const cancelQueued = enqueue(reveal)
    let observer: IntersectionObserver | undefined
    if (ref.current && typeof IntersectionObserver === "function") {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) reveal()
        },
        { rootMargin }
      )
      observer.observe(ref.current)
    }
    return () => {
      adjustPending(-1)
      cancelQueued()
      observer?.disconnect()
    }
  }, [ready, rootMargin])

  return (
    <div ref={ref} style={ready ? undefined : { minHeight }}>
      {ready ? children : null}
    </div>
  )
}

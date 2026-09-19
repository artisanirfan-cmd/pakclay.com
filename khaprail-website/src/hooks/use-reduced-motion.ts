import { useSyncExternalStore } from "react"

// `prefers-reduced-motion: reduce` as a tiny hook — replaces framer-motion's
// `useReducedMotion` (framer-motion was ~116 KiB of the main bundle, used in
// only two places, so it was removed entirely).
const QUERY = "(prefers-reduced-motion: reduce)"

function subscribe(onChange: () => void): () => void {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  )
}

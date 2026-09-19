import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

interface UseCategoryProductCountsResult {
  /** Real DIRECT product count per category id (callers roll counts up through the tree when needed — see `filterPopulatedCategories`). */
  counts: Map<string, number>
  isLoading: boolean
}

/**
 * Real product counts grouped by category — used to pick "which categories
 * actually have content" for data-driven homepage sections (e.g. Category
 * Showcase) and to keep navigation/link lists pointing only at populated
 * categories (`useLinkableCategories`).
 *
 * The header, footer and several page sections all call this on every page,
 * so the single underlying query is shared: one in-flight request, then an
 * in-memory copy for the rest of the session (a full page load re-fetches).
 */
let cached: Map<string, number> | null = null
let inflight: Promise<Map<string, number>> | null = null

function loadCounts(): Promise<Map<string, number>> {
  if (cached) return Promise.resolve(cached)
  if (inflight) return inflight
  inflight = Promise.resolve(supabase!.from("products").select("category_id")).then(({ data, error }) => {
    const next = new Map<string, number>()
    if (!error) {
      for (const row of data ?? []) {
        if (!row.category_id) continue
        next.set(row.category_id, (next.get(row.category_id) ?? 0) + 1)
      }
      cached = next
    }
    inflight = null
    return next
  })
  return inflight
}

export function useCategoryProductCounts(): UseCategoryProductCountsResult {
  const [counts, setCounts] = useState<Map<string, number>>(() => cached ?? new Map())
  const [isLoading, setIsLoading] = useState(() => supabase !== null && cached === null)

  useEffect(() => {
    if (!supabase || cached) return
    let cancelled = false
    void loadCounts().then((next) => {
      if (cancelled) return
      setCounts(next)
      setIsLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return { counts, isLoading }
}

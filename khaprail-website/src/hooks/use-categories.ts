import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { Category } from "@/types/category"

interface UseCategoriesResult {
  categories: Category[]
  isLoading: boolean
  /** Set when Supabase isn't provisioned yet, or the query itself failed. */
  error: string | null
}

interface Snapshot {
  categories: Category[]
  error: string | null
  loadedAt: number
}

// A stable empty list so consumers' memo/effect deps don't change every render.
const EMPTY: Category[] = []

// The homepage alone mounts this hook from 11 components (header, mobile menu,
// featured row, footer, showcase sections, ...). Each used to fire its own
// identical `categories` query — 11 requests and 11 separate state updates
// (= 11 re-render passes) during load. Now there is ONE in-flight request that
// every caller shares, and the result is kept in memory for a few minutes.
// Failures are never cached, so a transient error retries on the next mount.
const CACHE_TTL_MS = 5 * 60 * 1000
let cached: Snapshot | null = null
let inflight: Promise<Snapshot> | null = null

function isFresh(snapshot: Snapshot | null): snapshot is Snapshot {
  return snapshot !== null && Date.now() - snapshot.loadedAt < CACHE_TTL_MS
}

function loadCategories(): Promise<Snapshot> {
  if (isFresh(cached)) return Promise.resolve(cached)
  if (inflight) return inflight
  const request = Promise.resolve(
    supabase!
      .from("categories")
      .select("id, name, slug, parent_id, cover_image_url, sort_order, is_featured, is_trending, created_at")
      .order("sort_order", { ascending: true })
  ).then(({ data, error }) => {
    const snapshot: Snapshot = { categories: data ?? EMPTY, error: error ? error.message : null, loadedAt: Date.now() }
    if (!error && inflight === request) cached = snapshot
    if (inflight === request) inflight = null
    return snapshot
  })
  inflight = request
  return request
}

/**
 * Drop the in-memory copy so the next `useCategories()` mount refetches.
 * Call after any admin write to the `categories` table (see
 * `lib/categories-admin.ts`) so the admin screens never show stale rows.
 */
export function invalidateCategories(): void {
  cached = null
  inflight = null
}

/**
 * Reads the admin-editable, self-referencing `categories` table
 * (12-CATEGORY-TAXONOMY.md) as a flat, sort_order-ordered list. Use
 * `src/lib/category-tree.ts` to derive roots/children/ancestors from it.
 * Never hardcode the category list in a component.
 */
export function useCategories(): UseCategoriesResult {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(() => (isFresh(cached) ? cached : null))

  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    void loadCategories().then((next) => {
      if (!cancelled) setSnapshot(next)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!supabase) return { categories: EMPTY, isLoading: false, error: "Supabase project not configured yet" }
  return { categories: snapshot?.categories ?? EMPTY, isLoading: snapshot === null, error: snapshot?.error ?? null }
}

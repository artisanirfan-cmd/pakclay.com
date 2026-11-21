import { createClient } from "@supabase/supabase-js"

// Idempotent category seed, run once at server start with the service-role
// key (same pattern as blog-publisher.ts). Inserts any category below whose
// slug is missing; never edits or deletes existing rows. Products appear in
// them automatically through the merged-membership rule
// (src/lib/category-membership.ts), so these pages are never empty.
// Edit the list, or manage categories in /admin/categories (an admin-deleted
// row listed here is re-created on the next restart; remove it from the list
// too to retire it for good).

interface CategorySpec {
  name: string
  slug: string
  parentSlug: string
  sort_order: number
}

const SEED: CategorySpec[] = [
  { name: "Clay Roof Tiles", slug: "clay-roof-tiles", parentSlug: "roof-tiles", sort_order: 1 },
  { name: "Ceramic Roof Tiles", slug: "ceramic-roof-tiles", parentSlug: "roof-tiles", sort_order: 2 },
  { name: "Brick Roof Tiles", slug: "brick-roof-tiles", parentSlug: "roof-tiles", sort_order: 3 },
]

export async function ensureCategories(): Promise<number> {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return 0
  const db = createClient(url, key, { auth: { persistSession: false } })
  let created = 0
  for (const spec of SEED) {
    const { data: existing } = await db.from("categories").select("id").eq("slug", spec.slug).maybeSingle()
    if (existing) continue
    const { data: parent } = await db.from("categories").select("id").eq("slug", spec.parentSlug).maybeSingle()
    if (!parent) continue
    const { error } = await db.from("categories").insert({
      name: spec.name,
      slug: spec.slug,
      parent_id: parent.id,
      sort_order: spec.sort_order,
    })
    if (error) console.error("[ensure-categories]", spec.slug, error.message)
    else {
      created++
      console.log(`[ensure-categories] created ${spec.slug}`)
    }
  }
  return created
}

export function startEnsureCategories() {
  setTimeout(() => ensureCategories().catch((e) => console.error("[ensure-categories]", e)), 10_000)
}

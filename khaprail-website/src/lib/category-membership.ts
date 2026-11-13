// Category merge: a product shows in every category that describes it.
//
// Categories here are combinations of a ROOM/USE (floor, wall, outdoor,
// kitchen, bathroom, living room, roof, pool, jali) and a MATERIAL (terracotta,
// concrete, mosaic, stone, granite, marble, clay...). Products are filed under
// ONE leaf (e.g. "Floor Tiles / Outdoor Floor Tiles / Terracotta Outdoor Floor
// Tiles"), but must also appear under "Terracotta Tiles", "Outdoor Tiles",
// "Clay Tiles", "Floor Tiles / Terracotta Floor Tiles" and so on, so no
// category page is ever empty. Membership is derived from the category names
// (no hardcoded ids), so admin-added categories merge automatically.
//
// Pure module: no imports, shared by the client and the server sitemap.

export interface CategoryLike {
  id: string
  name: string
  parent_id: string | null
}

// word in a category name -> canonical token(s) it stands for
const WORDS: Record<string, string[]> = {
  floor: ["floor"],
  wall: ["wall"],
  outdoor: ["outdoor"],
  kitchen: ["kitchen"],
  bathroom: ["bathroom"],
  living: ["living"],
  roof: ["roof"],
  roofing: ["roof"],
  pool: ["pool"],
  swimming: ["pool"],
  jali: ["jali", "wall"], // jali screens are wall elements
  khaprail: ["khaprail", "roof"], // khaprail is a roof tile
  terracotta: ["terracotta"],
  brick: ["terracotta"], // clay brick tiles = terracotta family
  clay: ["clay"],
  concrete: ["concrete"],
  cement: ["concrete"],
  mosaic: ["mosaic"],
  ceramic: ["mosaic"],
  stone: ["stone"],
  granite: ["granite"],
  marble: ["marble"],
  sandstone: ["sandstone"],
  industrial: ["industrial"],
  otti: ["otti"],
  pavers: ["pavers"],
  paver: ["pavers"],
}

// general -> more specific (a general category includes its specifics, and a
// specific category falls back to the general products when it has none)
const GENERAL_OF: Record<string, string> = {
  terracotta: "clay",
  khaprail: "terracotta",
  granite: "stone",
  marble: "stone",
  sandstone: "stone",
}

function wordsOf(name: string): string[] {
  return name.toLowerCase().split(/[^a-z]+/).filter(Boolean)
}

function tokensOfName(name: string): string[] {
  const out: string[] = []
  for (const w of wordsOf(name)) for (const t of WORDS[w] ?? []) if (!out.includes(t)) out.push(t)
  return out
}

function pathTokens(byId: Map<string, CategoryLike>, id: string): string[] {
  const names: string[] = []
  let cur = byId.get(id)
  const seen = new Set<string>()
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id)
    names.unshift(cur.name)
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined
  }
  const out: string[] = []
  for (const n of names) for (const t of tokensOfName(n)) if (!out.includes(t)) out.push(t)
  return out
}

function isGeneralOf(general: string, specific: string): boolean {
  let cur: string | undefined = GENERAL_OF[specific]
  while (cur) {
    if (cur === general) return true
    cur = GENERAL_OF[cur]
  }
  return false
}

/** Does a category carrying `have` tokens satisfy the requirement token `need`? */
function satisfies(have: string[], need: string): boolean {
  return have.some((t) => t === need || isGeneralOf(need, t) || isGeneralOf(t, need))
}

function matches(have: string[], need: string[]): boolean {
  return need.every((n) => satisfies(have, n))
}

/**
 * Every category id whose products belong on `categoryId`'s page: the
 * category itself, its descendants, and every other category that describes
 * the same combination of use and material. `directCounts` (category id ->
 * product count) lets the match relax its most specific token (the material,
 * then the room) until the page has at least one product.
 */
export function getMergedCategoryIds(
  categories: CategoryLike[],
  categoryId: string,
  directCounts?: Map<string, number>,
): string[] {
  const byId = new Map(categories.map((c) => [c.id, c]))
  if (!byId.has(categoryId)) return [categoryId]

  const children = new Map<string, string[]>()
  for (const c of categories) if (c.parent_id) children.set(c.parent_id, [...(children.get(c.parent_id) ?? []), c.id])
  const subtree = new Set<string>()
  const walk = (id: string) => {
    if (subtree.has(id)) return
    subtree.add(id)
    for (const k of children.get(id) ?? []) walk(k)
  }
  walk(categoryId)

  const tokens = new Map(categories.map((c) => [c.id, pathTokens(byId, c.id)]))
  const need = [...(tokens.get(categoryId) ?? [])]
  const total = (ids: string[]) => ids.reduce((s, id) => s + (directCounts?.get(id) ?? 0), 0)

  let required = need
  for (;;) {
    const ids = categories
      .filter((c) => subtree.has(c.id) || (required.length > 0 && matches(tokens.get(c.id) ?? [], required)))
      .map((c) => c.id)
    if (!directCounts || total(ids) > 0 || required.length <= 1) return ids
    required = required.slice(0, -1) // drop the most specific (last) token and retry
  }
}

/** Categories with at least one product once merged. Never returns an empty tree entry for a category with any related product. */
export function getPopulatedCategoryIds(categories: CategoryLike[], directCounts: Map<string, number>): Set<string> {
  const out = new Set<string>()
  for (const c of categories) {
    const ids = getMergedCategoryIds(categories, c.id, directCounts)
    if (ids.reduce((s, id) => s + (directCounts.get(id) ?? 0), 0) > 0) out.add(c.id)
  }
  return out
}

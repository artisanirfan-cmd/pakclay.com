// Topical matching between blog posts and the catalog, used for internal
// cross-links (blog post -> related categories/products, category/product ->
// related posts). Purely data-driven: a post's real `entity_tags`, category
// and title are compared with real category / product names. Nothing here
// invents a relationship — no shared keyword, no link.

/** Words too generic to signal a topic (every product is a "tile"; posts mention Lahore/Pakistan). */
const STOP_WORDS = new Set([
  "tile", "tiles", "and", "the", "for", "with", "inch", "pakistan", "lahore", "of", "in", "to", "how", "what",
  "why", "is", "are", "a", "an", "guide", "complete", "made", "our", "your", "best", "new",
])

/** Lower-cased, singularised topical keywords in the given texts ("Terracotta Tiles" -> {terracotta}). */
export function keywordsOf(...texts: Array<string | null | undefined>): Set<string> {
  const out = new Set<string>()
  for (const text of texts) {
    for (const raw of (text ?? "").toLowerCase().split(/[^a-z0-9]+/)) {
      let word = raw
      if (word.length < 3 || /^\d/.test(word) || STOP_WORDS.has(word)) continue
      if (word.length > 4 && word.endsWith("s") && !word.endsWith("ss")) word = word.slice(0, -1)
      if (STOP_WORDS.has(word)) continue
      out.add(word)
    }
  }
  return out
}

/** Number of keywords two sets share (0 = unrelated). */
export function overlap(a: Set<string>, b: Set<string>): number {
  let n = 0
  for (const word of a) if (b.has(word)) n++
  return n
}

/** Keywords describing a blog post: its title, category and entity tags (all real, admin-entered fields). */
export function postKeywords(post: { title: string; category: string | null; entity_tags?: string[] | null }): Set<string> {
  return keywordsOf(post.title, post.category, ...(post.entity_tags ?? []))
}

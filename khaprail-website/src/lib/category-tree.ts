import type { Category } from "@/types/category"

/** Top-level categories, ordered for display. */
export function getRootCategories(categories: Category[]): Category[] {
  return categories.filter((c) => c.parent_id === null).sort((a, b) => a.sort_order - b.sort_order)
}

/** Direct children of a category, ordered for display. */
export function getCategoryChildren(categories: Category[], parentId: string): Category[] {
  return categories.filter((c) => c.parent_id === parentId).sort((a, b) => a.sort_order - b.sort_order)
}

/** Ancestor chain from root down to (but excluding) the category itself — for breadcrumbs. */
export function getCategoryAncestors(categories: Category[], categoryId: string): Category[] {
  const byId = new Map(categories.map((c) => [c.id, c]))
  const ancestors: Category[] = []
  let current = byId.get(categoryId)
  while (current?.parent_id) {
    const parent = byId.get(current.parent_id)
    if (!parent) break
    ancestors.unshift(parent)
    current = parent
  }
  return ancestors
}

/** The top-level category a given category rolls up to (itself, if it's already a root) — for grouping products assigned to subcategories under a root-level tab/filter. */
export function getRootCategoryId(categories: Category[], categoryId: string): string {
  const ancestors = getCategoryAncestors(categories, categoryId)
  return ancestors.length > 0 ? ancestors[0].id : categoryId
}

/**
 * A category's own id plus every descendant category id, recursively —
 * for category-page product queries/counts that must include products
 * attached to a subcategory (e.g. `Terracotta Floor Tiles`) when browsing
 * its parent (`Floor Tiles`), not just products attached directly to the
 * category itself.
 */
export function getDescendantCategoryIds(categories: Category[], categoryId: string): string[] {
  const ids = [categoryId]
  for (const child of getCategoryChildren(categories, categoryId)) {
    ids.push(...getDescendantCategoryIds(categories, child.id))
  }
  return ids
}

export interface CategoryTreeRow {
  category: Category
  depth: number
}

/** Depth-first tree order (root, then its children, recursively) — for the admin list's indented display. */
export function flattenCategoryTree(categories: Category[]): CategoryTreeRow[] {
  const rows: CategoryTreeRow[] = []
  function visit(parentId: string | null, depth: number) {
    for (const category of categories.filter((c) => c.parent_id === parentId).sort((a, b) => a.sort_order - b.sort_order)) {
      rows.push({ category, depth })
      visit(category.id, depth + 1)
    }
  }
  visit(null, 0)
  return rows
}

/**
 * Categories that have at least one product in their subtree (products filed
 * directly under them or under any descendant). `directCounts` maps a
 * category id to the number of products assigned to it directly. A populated
 * child always keeps its ancestors, so the result is a valid tree.
 */
export function filterPopulatedCategories(categories: Category[], directCounts: Map<string, number>): Category[] {
  const childrenOf = new Map<string, string[]>()
  for (const c of categories) {
    if (c.parent_id) childrenOf.set(c.parent_id, [...(childrenOf.get(c.parent_id) ?? []), c.id])
  }
  const memo = new Map<string, number>()
  const total = (id: string, seen: Set<string> = new Set()): number => {
    if (memo.has(id)) return memo.get(id)!
    if (seen.has(id)) return 0
    seen.add(id)
    const sum = (directCounts.get(id) ?? 0) + (childrenOf.get(id) ?? []).reduce((acc, child) => acc + total(child, seen), 0)
    memo.set(id, sum)
    return sum
  }
  return categories.filter((c) => total(c.id) > 0)
}

/**
 * Normalises an admin-entered internal link and keeps it off dead ends. The
 * homepage tiles' links are free-text CMS fields: one was stored as
 * "categories/roof-tiles" (no leading slash, so it only worked from "/"), and
 * several pointed at categories with no products (noindex "coming soon"
 * pages). Returns an absolute-path link; a link into an empty or unknown
 * category falls back to the categories index. External links, and links
 * that are not category URLs, are returned unchanged (apart from the slash).
 */
export function resolveCategoryLink(url: string, allCategories: Category[], populatedCategories: Category[]): string {
  if (/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(url)) return url // external / mailto / tel / protocol-relative
  const path = url.startsWith("/") ? url : `/${url}`
  const match = /^\/categories\/([^/?#]+)/.exec(path)
  if (!match || allCategories.length === 0) return path
  const slug = match[1]
  return populatedCategories.some((c) => c.slug === slug) ? path : "/categories"
}

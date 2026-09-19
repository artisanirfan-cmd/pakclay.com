import { useMemo } from "react"
import { useCategories } from "@/hooks/use-categories"
import { useCategoryProductCounts } from "@/hooks/use-category-product-counts"
import { filterPopulatedCategories } from "@/lib/category-tree"
import type { Category } from "@/types/category"

interface UseLinkableCategoriesResult {
  /** Categories that have at least one product (directly or in a subcategory). */
  categories: Category[]
  /** The full, unfiltered list (for resolving/validating slugs). */
  allCategories: Category[]
  isLoading: boolean
  error: string | null
}

/**
 * The category list to use for every LINK LIST (header mega-menu, mobile menu,
 * footer, homepage rails, /categories grid, subcategory chips).
 *
 * A category with no products (11 of the 15 root categories today) renders a
 * "products coming soon" page that is `noindex` and left out of the sitemap;
 * linking to it from every page's chrome only sent visitors and crawlers to
 * dead ends and leaked link equity into pages that are deliberately not
 * indexed. This uses the same rule as the noindex/sitemap decision — "has at
 * least one product in its subtree" — so links, robots signals and the
 * sitemap always agree. Empty categories stay reachable by direct URL and in
 * the admin, and reappear here automatically the moment a product is added.
 *
 * Fails open: if no category at all qualifies (or counts could not be
 * loaded) the full list is returned so navigation is never empty.
 */
export function useLinkableCategories(): UseLinkableCategoriesResult {
  const { categories, isLoading, error } = useCategories()
  const { counts, isLoading: countsLoading } = useCategoryProductCounts()

  const linkable = useMemo(() => {
    if (categories.length === 0 || counts.size === 0) return categories
    const populated = filterPopulatedCategories(categories, counts)
    return populated.length > 0 ? populated : categories
  }, [categories, counts])

  return { categories: linkable, allCategories: categories, isLoading: isLoading || countsLoading, error }
}

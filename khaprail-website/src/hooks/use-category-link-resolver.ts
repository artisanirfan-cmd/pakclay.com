import { useCallback } from "react"
import { useLinkableCategories } from "@/hooks/use-linkable-categories"
import { resolveCategoryLink } from "@/lib/category-tree"

/**
 * Returns a function that cleans an admin-entered internal link (see
 * `resolveCategoryLink`). While categories are still loading the link is
 * returned as entered (slash-normalised), so nothing flashes or breaks.
 */
export function useCategoryLinkResolver(): (url: string) => string {
  const { categories, allCategories, isLoading } = useLinkableCategories()
  return useCallback(
    (url: string) => (isLoading ? (/^([a-z][a-z0-9+.-]*:|\/\/|\/)/i.test(url) ? url : `/${url}`) : resolveCategoryLink(url, allCategories, categories)),
    [allCategories, categories, isLoading],
  )
}

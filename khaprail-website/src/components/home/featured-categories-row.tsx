import { CategoryIconRail } from "@/components/shared/category-icon-rail"
import { useLinkableCategories } from "@/hooks/use-linkable-categories"
import { getRootCategories } from "@/lib/category-tree"

// "Featured Categories" (10-HOMEPAGE-SPEC.md) — circular category-icon row,
// immediately after the hero. Admin-orderable via `categories.sort_order`.
export function FeaturedCategoriesRow() {
  const { categories, isLoading, error } = useLinkableCategories()
  const roots = getRootCategories(categories)

  if (error || (!isLoading && roots.length === 0)) return null

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      {/* This section (and FeatureRow below) had no heading element at all,
          breaking the otherwise-consistent one-h2-per-section pattern and
          skipping both for screen-reader users navigating by heading — same
          visible treatment as every other homepage section now
          (UX_AUDIT_REPORT.md finding 13 / 1.7). */}
      <h2 className="mb-6 text-center font-heading text-4xl font-semibold text-foreground sm:text-5xl">
        Featured Categories
      </h2>
      <CategoryIconRail categories={roots} isLoading={isLoading} />
    </section>
  )
}

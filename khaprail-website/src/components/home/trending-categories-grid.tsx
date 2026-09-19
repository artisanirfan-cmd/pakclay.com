import { Link } from "react-router-dom"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { CategoryBadgeCircle } from "@/components/shared/category-badge-circle"
import { useCategories } from "@/hooks/use-categories"
import { useCategoryProductCounts } from "@/hooks/use-category-product-counts"
import { getRootCategories, getRootCategoryId } from "@/lib/category-tree"

const NEW_WINDOW_DAYS = 30
const SKELETON_COUNT = 4

function isNew(createdAt: string): boolean {
  const ageMs = Date.now() - new Date(createdAt).getTime()
  return ageMs < NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000
}

// "Trending/Collections grid" (10-HOMEPAGE-SPEC.md) — circular photo badges
// with colored fills (2026-08-25 restyle, matching Featured Categories'
// treatment). Which categories show here is real admin curation
// (`categories.is_trending`), not a positional array slice — and even a
// trending-flagged category only renders once it has real products
// (directly or via a subcategory, same rolled-up-to-root count as
// `CategoryShowcase`), so this never links to a dead "coming soon" page
// (UX_AUDIT_REPORT.md finding 3 / 5.3). "NEW" ribbon is real (`created_at`
// within a short window), never decorative (02-DESIGN-SYSTEM.md Von
// Restorff isolation effect + "honest data only").
export function TrendingCategoriesGrid() {
  const { categories, isLoading: categoriesLoading, error } = useCategories()
  const { counts, isLoading: countsLoading } = useCategoryProductCounts()
  const isLoading = categoriesLoading || countsLoading

  const rootCounts = new Map<string, number>()
  for (const [categoryId, count] of counts.entries()) {
    const rootId = getRootCategoryId(categories, categoryId)
    rootCounts.set(rootId, (rootCounts.get(rootId) ?? 0) + count)
  }
  const trending = getRootCategories(categories).filter(
    (c) => c.is_trending && (rootCounts.get(c.id) ?? 0) > 0
  )

  if (error || (!isLoading && trending.length === 0)) return null

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
      <div className="mb-10 text-center">
        <h2 className="font-heading text-4xl font-semibold sm:text-5xl">Trending Categories</h2>
        <p className="mt-2 text-muted-foreground">Roof, floor, and wall tiles grouped the way you'd ask for them.</p>
      </div>
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        {isLoading
          ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Skeleton className="size-28 rounded-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))
          : trending.map((category, index) => (
              <Link
                key={category.id}
                to={`/categories/${category.slug}`}
                className="group/card relative flex flex-col items-center gap-3 rounded-lg p-2 text-center outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <div className="transition-transform group-hover/card:scale-105">
                  <CategoryBadgeCircle category={category} index={index} size="lg" />
                </div>
                {isNew(category.created_at) && (
                  <Badge className="absolute top-0 right-2 bg-badge-accent text-badge-accent-foreground">NEW</Badge>
                )}
                <span className="text-lg font-medium text-foreground">{category.name}</span>
              </Link>
            ))}
      </div>
      <div className="mt-8 text-center">
        <Link to="/categories" className="text-sm font-medium text-primary hover:underline">
          View All Categories
        </Link>
      </div>
    </section>
  )
}

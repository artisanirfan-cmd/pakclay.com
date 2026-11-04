import { Link } from "react-router-dom"
import { Skeleton } from "@/components/ui/skeleton"
import { StorageImage } from "@/components/shared/storage-image"
import { useCategories } from "@/hooks/use-categories"
import { useCategoryProductCounts } from "@/hooks/use-category-product-counts"
import { getRootCategories, getRootCategoryId } from "@/lib/category-tree"

const SHOWCASE_COUNT = 3

// "Category Showcase" — three large photo cards on a warm-brown panel,
// distinct from the earlier untitled/panel-less "3-image feature row"
// (feature-row.tsx) via its title, panel background, and portrait-ish card
// ratio, so the two don't read as duplicates even though they share the
// same "N photo cards + caption" idea. Categories are picked by real
// product count (subcategory products roll up to their root ancestor via
// `getRootCategoryId`) — never an arbitrary/manual pick. Hides entirely
// unless at least 3 categories genuinely have real products, since showing
// fewer than 3 cards in a "three photo card" layout would look broken
// rather than honest.
export function CategoryShowcase() {
  const { categories, isLoading: categoriesLoading, error } = useCategories()
  const { counts, isLoading: countsLoading } = useCategoryProductCounts()
  const isLoading = categoriesLoading || countsLoading

  const roots = getRootCategories(categories)
  const rootCounts = new Map<string, number>()
  for (const [categoryId, count] of counts.entries()) {
    const rootId = getRootCategoryId(categories, categoryId)
    rootCounts.set(rootId, (rootCounts.get(rootId) ?? 0) + count)
  }
  const topCategories = roots
    .filter((c) => (rootCounts.get(c.id) ?? 0) > 0)
    .sort((a, b) => (rootCounts.get(b.id) ?? 0) - (rootCounts.get(a.id) ?? 0))
    .slice(0, SHOWCASE_COUNT)

  if (error || (!isLoading && topCategories.length < SHOWCASE_COUNT)) return null

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <div className="rounded-2xl bg-panel-warm p-6 sm:p-10">
        <h2 className="mb-8 text-center font-heading text-4xl font-semibold text-foreground sm:text-5xl">
          Explore Our Range
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {isLoading
            ? Array.from({ length: SHOWCASE_COUNT }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-3">
                  <Skeleton className="aspect-[3/4] w-full rounded-2xl" />
                  <Skeleton className="h-5 w-1/2" />
                </div>
              ))
            : topCategories.map((category) => (
                <Link
                  key={category.id}
                  to={`/categories/${category.slug}`}
                  className="group flex flex-col items-center gap-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <div className="relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-2xl bg-foreground/10 shadow-sm">
                    {category.cover_image_url && (
                      // Real WebP/quality/size optimization via Supabase's
                      // transform endpoint (SEO/perf batch A, 2026-09-10).
                      // Width/height match the container's own 3:4 ratio,
                      // reserving layout space before load
                      // (UX_AUDIT_REPORT.md finding 11).
                      <StorageImage
                        src={category.cover_image_url}
                        alt=""
                        width={300}
                        height={400}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <span className="font-heading text-2xl font-bold text-foreground">{category.name}</span>
                </Link>
              ))}
        </div>
      </div>
    </section>
  )
}

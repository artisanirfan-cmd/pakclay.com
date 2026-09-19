import { Link } from "react-router-dom"
import { Skeleton } from "@/components/ui/skeleton"
import { StorageImage } from "@/components/shared/storage-image"
import { useLinkableCategories } from "@/hooks/use-linkable-categories"
import { getRootCategories } from "@/lib/category-tree"

const FEATURE_COUNT = 3

// "3-image feature row" (10-HOMEPAGE-SPEC.md) — rounded-corner photo cards
// with a plain white caption underneath (2026-08-25 restyle), each linking
// to a category. Uses the first 3 root categories by `sort_order`, so
// admins control which 3 appear here by reordering categories in
// /admin/categories.
export function FeatureRow() {
  const { categories, isLoading, error } = useLinkableCategories()
  const featured = getRootCategories(categories).slice(0, FEATURE_COUNT)

  if (error || (!isLoading && featured.length === 0)) return null

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      {/* Had no heading element at all — see featured-categories-row.tsx's
          comment (UX_AUDIT_REPORT.md finding 13 / 1.7). "Popular Categories"
          since "Shop by Category" already names a different section further
          down the page (shop-by-category-section.tsx). */}
      <h2 className="mb-8 text-center font-heading text-4xl font-semibold text-foreground sm:text-5xl">
        Popular Categories
      </h2>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        {isLoading
          ? Array.from({ length: FEATURE_COUNT }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3">
                <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
                <Skeleton className="h-5 w-2/3" />
              </div>
            ))
          : featured.map((category) => (
              <Link
                key={category.id}
                to={`/categories/${category.slug}`}
                className="group flex flex-col gap-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl bg-panel-navy shadow-sm">
                  {category.cover_image_url && (
                    // Real WebP/quality/size optimization via Supabase's
                    // transform endpoint (SEO/perf batch A, 2026-09-10) — this
                    // is where the UX audit's flagged `wall-tiles.png.png`
                    // (2061KB)/`roof-tiles.png.png` (2246KB) actually render,
                    // confirmed live via Lighthouse as ~2.2MB wasted bytes
                    // each. Width/height match the container's own 4:3 ratio.
                    <StorageImage
                      src={category.cover_image_url}
                      alt=""
                      width={400}
                      height={300}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  )}
                </div>
                <span className="font-heading text-2xl font-semibold text-foreground">
                  Shop {category.name}
                </span>
              </Link>
            ))}
      </div>
    </section>
  )
}

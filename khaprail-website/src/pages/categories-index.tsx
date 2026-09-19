import { useDocumentHead } from "@/hooks/use-document-head"
import { Link } from "react-router-dom"
import { Skeleton } from "@/components/ui/skeleton"
import { CategoryTile } from "@/components/categories/category-tile"
import { useLinkableCategories } from "@/hooks/use-linkable-categories"
import { getRootCategories } from "@/lib/category-tree"

// /categories — full image-card grid of every top-level category
// (12-CATEGORY-TAXONOMY.md), following the same Hick's-Law grid pattern as
// the mega-menu and homepage rows rather than a text list (02-DESIGN-SYSTEM.md).
export function CategoriesIndex() {
  useDocumentHead({
    title: "Tile Categories — Roof, Floor, Wall & Outdoor",
    description:
      "Explore our tile categories: roof, floor, wall, outdoor, kitchen and bathroom tiles in clay, terracotta, stone and concrete, plus terracotta jali.",
    path: "/categories",
  })
  const { categories, isLoading, error } = useLinkableCategories()
  const roots = getRootCategories(categories)

  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-10 text-center">
          <h1 className="font-heading text-6xl font-semibold sm:text-7xl">Our Categories</h1>
          <p className="mt-2 text-muted-foreground">
            Roof, floor, and wall tiles grouped the way you'd ask for them.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="aspect-[16/10] w-full rounded-md" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        ) : error || roots.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Categories coming soon.</p>
        ) : (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
            {roots.map((category) => (
              <Link
                key={category.id}
                to={`/categories/${category.slug}`}
                className="group/card flex flex-col items-center gap-2 rounded-lg p-2 text-center outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <CategoryTile category={category} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

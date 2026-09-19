import { useDocumentHead } from "@/hooks/use-document-head"
import { Skeleton } from "@/components/ui/skeleton"
import { ProductCard } from "@/components/products/product-card"
import { useBestSellers } from "@/hooks/use-best-sellers"

// /best-sellers (01-SITE-MAP.md) — ranked by real `sample_inquiries` volume,
// same honest-data source as the homepage rail (10-HOMEPAGE-SPEC.md).
export function BestSellers() {
  useDocumentHead({
    title: "Best Sellers — Most Requested Tiles",
    description:
      "Our most-requested tiles, ranked from real customer sample requests. See which clay and terracotta tiles people ask for most, and request a sample.",
    path: "/best-sellers",
  })
  const { products, isLoading, error } = useBestSellers()

  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-10 text-center">
          <h1 className="font-heading text-6xl font-semibold sm:text-7xl">Best Sellers</h1>
          <p className="mt-2 text-muted-foreground">Our most-requested tiles, ranked by real customer inquiries.</p>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="aspect-square w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        ) : error || products.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            Best sellers are ranked by real customer sample requests — check back once a few more come in.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            <h2 className="sr-only">Best selling tiles</h2>
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

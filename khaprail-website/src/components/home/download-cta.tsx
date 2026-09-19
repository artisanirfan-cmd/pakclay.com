import { lazy, Suspense } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { useCategories } from "@/hooks/use-categories"
import { useDownloadableProducts } from "@/hooks/use-downloadable-products"
import { buildCatalogCategories } from "@/lib/build-catalog-categories"

// @react-pdf/renderer is large — only load it if a visitor actually has
// something to download (same reasoning as /downloads' lazy button).
const DownloadCatalogButton = lazy(() =>
  import("@/components/downloads/download-catalog-button").then((m) => ({ default: m.DownloadCatalogButton }))
)

// Homepage catalog-download CTA (Hero already links "Download Catalog" to
// /downloads — this repeats the same real, live-generated PDF closer to the
// bottom of the page rather than duplicating the per-product spec-sheet list).
export function DownloadCta() {
  const { categories } = useCategories()
  const { products, isLoading } = useDownloadableProducts()

  if (!isLoading && products.length === 0) return null

  const catalogCollections = buildCatalogCategories(products, categories)

  return (
    <section className="border-t border-border bg-muted py-16">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-4 text-center sm:px-6">
        <h2 className="font-heading text-4xl font-semibold sm:text-5xl">Get the Full Catalog</h2>
        <p className="max-w-xl text-muted-foreground">
          Every product, size, and category in one branded PDF — generated live from our current catalog.
        </p>
        {isLoading ? (
          <Button size="lg" className="h-14 px-7 text-lg" disabled>
            Preparing...
          </Button>
        ) : (
          <Suspense fallback={<Button size="lg" className="h-14 px-7 text-lg" disabled>Preparing...</Button>}>
            <DownloadCatalogButton collections={catalogCollections} />
          </Suspense>
        )}
        <Link to="/downloads" className="text-sm font-medium text-primary hover:underline">
          Browse individual spec sheets
        </Link>
      </div>
    </section>
  )
}

import { useDocumentHead } from "@/hooks/use-document-head"
import { lazy, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useCategories } from "@/hooks/use-categories"
import { useDownloadableProducts } from "@/hooks/use-downloadable-products"
import { buildCatalogCategories } from "@/lib/build-catalog-categories"

// @react-pdf/renderer is large — only load it once a visitor is actually on
// this page (same reasoning as the PDP's lazy DownloadSpecSheetButton).
const DownloadCatalogButton = lazy(() =>
  import("@/components/downloads/download-catalog-button").then((m) => ({ default: m.DownloadCatalogButton }))
)
const DownloadSpecSheetButton = lazy(() =>
  import("@/components/shared/download-spec-sheet-button").then((m) => ({ default: m.DownloadSpecSheetButton }))
)

// /downloads (01-SITE-MAP.md) — the Hero's "Download Catalog" CTA points
// here. Both the full catalog and every spec sheet are generated live from
// real `products`/`categories` data (@react-pdf/renderer), never a static
// file, so there's nothing to go stale.
export function Downloads() {
  useDocumentHead({
    title: "Downloads — Tile Catalog & Spec Sheets",
    description:
      "Download our full tile catalog or a spec sheet for any tile as a PDF, generated live from our current product range.",
    path: "/downloads",
  })
  const { categories, isLoading: categoriesLoading } = useCategories()
  const { products, isLoading: productsLoading } = useDownloadableProducts()
  const isLoading = categoriesLoading || productsLoading

  const catalogCollections = buildCatalogCategories(products, categories)

  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
        <div className="mb-10 text-center">
          <h1 className="font-heading text-6xl font-semibold sm:text-7xl">Downloads</h1>
          <p className="mt-2 text-muted-foreground">Our full catalog and individual product spec sheets.</p>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-12 w-56" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Downloads coming soon.</p>
        ) : (
          <>
            <div className="mb-10 flex justify-center">
              <Suspense fallback={<Button size="lg" className="h-14 px-7 text-lg" disabled>Preparing catalog...</Button>}>
                <DownloadCatalogButton collections={catalogCollections} />
              </Suspense>
            </div>

            <div className="flex flex-col divide-y divide-border border-t border-b border-border">
              {products.map((product) => (
                <div key={product.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="font-medium text-foreground">{product.name}</p>
                    {product.size && <p className="text-sm text-muted-foreground">{product.size}</p>}
                  </div>
                  <Suspense fallback={<Button size="sm" variant="outline" disabled>Preparing...</Button>}>
                    <DownloadSpecSheetButton product={product} size="sm" className="" />
                  </Suspense>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  )
}

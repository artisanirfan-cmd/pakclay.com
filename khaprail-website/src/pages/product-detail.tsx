import { RelatedPosts } from "@/components/blog/related-posts"
import { keywordsOf } from "@/lib/related-content"
import { useDocumentHead } from "@/hooks/use-document-head"
import { JsonLd } from "@/components/seo/json-ld"
import { useCategories } from "@/hooks/use-categories"
import { getCategoryAncestors } from "@/lib/category-tree"
import { breadcrumbJsonLd, productJsonLd } from "@/lib/seo/json-ld"
import { shareImage } from "@/lib/seo/image"
import { cleanText, truncateAtWord } from "@/lib/seo/text"
import { lazy, Suspense } from "react"
import { Link, useParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Gallery } from "@/components/pdp/gallery"
import { AboutItemAccordion } from "@/components/pdp/about-item-accordion"
import { AiSummaryCard } from "@/components/pdp/ai-summary-card"
import { CompareTable } from "@/components/pdp/compare-table"
import { SampleRequestDialog } from "@/components/pdp/sample-request-dialog"
import { ProductRail } from "@/components/shared/product-rail"
import { useProduct } from "@/hooks/use-product"
import { useRelatedProducts } from "@/hooks/use-related-products"
import { useComparableProducts } from "@/hooks/use-comparable-products"
import { useExploreProducts } from "@/hooks/use-explore-products"

// @react-pdf/renderer is large (fontkit, its own layout engine) — load it
// only when a PDP actually mounts, not as part of every route's bundle.
const DownloadSpecSheetButton = lazy(() =>
  import("@/components/shared/download-spec-sheet-button").then((m) => ({ default: m.DownloadSpecSheetButton }))
)

// /products/[slug] — product detail page (05-PDP-SPEC.md, Store.com
// reference pattern): single photo + one thumbnail, title + price, spec
// table, "Get a Sample," "About This Item" accordion, "Similar Products,"
// "Compare With Similar Items" (real-data-gated), "Explore More Products."
export function ProductDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { product, isLoading, error } = useProduct(slug)

  const relatedProducts = useRelatedProducts(product?.category_id ?? null, product?.id ?? "")
  const comparableProducts = useComparableProducts(product?.category_id ?? null, product?.id ?? "")
  const exploreProducts = useExploreProducts(product?.id ?? "")
  const { categories } = useCategories()

  // Real fields only: a product whose description is still placeholder copy
  // (cleanText() returns "") gets a description built from its real name,
  // category and size instead — never the placeholder text.
  useDocumentHead(
    product
      ? {
          // A category can share a product's exact name (e.g. "Marble Living
          // Room Wall Tiles"); the suffix keeps the two titles distinct.
          title: (() => {
            const category = product.category_name
            if (!category) return product.name
            const sameName = category.toLowerCase().includes(product.name.toLowerCase())
            const candidate = sameName ? `${product.name} — Product Details` : `${product.name} — ${category}`
            return candidate.length <= 50 ? candidate : product.name
          })(),
          description:
            truncateAtWord(cleanText(product.description), 155) ||
            `${product.name}${product.category_name ? ` — ${product.category_name}` : ""} from PAKCLAY.COM${
              product.size ? `, size ${product.size}` : ""
            }. See photos and request a free sample.`,
          path: `/products/${product.slug}`,
          image: shareImage(product.cover_image_url ?? product.product_images[0]?.image_url, 630),
          imageAlt: product.name,
          type: "product",
          product: { priceAmount: product.price },
        }
      : null,
  )

  if (isLoading) {
    return (
      <main className="min-h-svh flex-1">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="flex flex-col gap-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </main>
    )
  }

  if (error || !product) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-2 px-6 py-24 text-center">
        <h1 className="font-heading text-2xl">Product not found</h1>
        <p className="text-sm text-muted-foreground">
          We couldn't find that product. Browse the full catalog instead.
        </p>
        <Button className="mt-4" nativeButton={false} render={<Link to="/products" />}>
          View All Products
        </Button>
      </main>
    )
  }

  const productCategory = product.category_id ? categories.find((c) => c.id === product.category_id) : undefined
  const productCrumbs = [
    { name: "Home", path: "/" },
    ...(productCategory ? [...getCategoryAncestors(categories, productCategory.id), productCategory] : []).map((c) => ({
      name: c.name,
      path: `/categories/${c.slug}`,
    })),
    { name: product.name, path: `/products/${product.slug}` },
  ]

  return (
    <main className="flex-1">
      <JsonLd data={[productJsonLd(product), breadcrumbJsonLd(productCrumbs)]} />
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2">
        <Gallery
          productName={product.name}
          coverImageUrl={product.cover_image_url}
          productImages={product.product_images}
        />

        <div className="flex flex-col gap-6">
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h1 className="font-heading text-4xl">{product.name}</h1>
              {product.price != null && (
                <p className="font-heading text-3xl font-semibold text-primary">
                  PKR {product.price.toLocaleString()}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <SampleRequestDialog productId={product.id} productName={product.name} />
            <Suspense
              fallback={
                <Button size="lg" variant="outline" className="h-14 px-7 text-lg" disabled>
                  Download Spec Sheet
                </Button>
              }
            >
              <DownloadSpecSheetButton product={product} />
            </Suspense>
          </div>

          <AboutItemAccordion product={product} />

          {product.ai_summary && <AiSummaryCard summary={product.ai_summary} />}
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 border-t border-border px-4 py-16 sm:px-6">
        <ProductRail
          title="Similar Products"
          emptyCopy="No other products in this category yet."
          products={relatedProducts.products}
          isLoading={relatedProducts.isLoading}
          hideWhenEmpty
        />

        <CompareTable product={product} comparableProducts={comparableProducts.products} />

        <ProductRail
          title="Explore More Products"
          emptyCopy="More products are on the way."
          viewAllTo="/products"
          products={exploreProducts.products}
          isLoading={exploreProducts.isLoading}
          hideWhenEmpty
        />
      </div>
      <div className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6">
        <RelatedPosts keywords={keywordsOf(product.name, product.category_name)} />
      </div>
    </main>
  )
}

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
import { SpecBlock } from "@/components/pdp/spec-block"
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

  const fullDescription = cleanText(product.description)
  const shortDescription = truncateAtWord(fullDescription, 200)
  const factChips = [product.size, product.finish, product.thickness, product.country_of_origin ? `Made in ${product.country_of_origin}` : null].filter(
    (v): v is string => !!v,
  )
  const hasSpecs = [
    product.brand, product.merchant, product.category_name, product.availability, product.sku,
    product.manufacturer, product.size, product.thickness, product.finish, product.country_of_origin,
  ].some(Boolean)

  return (
    <main className="flex-1">
      <JsonLd data={[productJsonLd(product), breadcrumbJsonLd(productCrumbs)]} />
      {/* Hero: photo panel + info panel (Option B redesign, 2026-11-05). */}
      <section className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="bg-muted px-4 py-6 sm:px-8 sm:py-10 lg:px-12 lg:py-14">
          <Gallery
            productName={product.name}
            coverImageUrl={product.cover_image_url}
            productImages={product.product_images}
          />
        </div>

        <div className="flex flex-col justify-center gap-6 bg-panel-navy px-4 py-10 sm:px-10 lg:px-14 lg:py-16">
          <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
            <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              {productCrumbs.slice(0, -1).map((crumb, index, all) => (
                <li key={crumb.path} className="flex items-center gap-1.5">
                  <Link to={crumb.path} className="hover:text-foreground hover:underline">
                    {crumb.name}
                  </Link>
                  {index < all.length - 1 && <span aria-hidden="true">/</span>}
                </li>
              ))}
            </ol>
          </nav>

          <div className="flex flex-col gap-3">
            {product.category_name && (
              <p className="text-xs font-semibold tracking-[0.15em] text-primary uppercase">{product.category_name}</p>
            )}
            <h1 className="font-heading text-4xl leading-[1.08] font-bold tracking-tight sm:text-5xl">{product.name}</h1>
            {product.price != null && (
              <p className="font-heading text-3xl font-semibold text-price">PKR {product.price.toLocaleString()}</p>
            )}
          </div>

          {shortDescription && <p className="max-w-prose text-lg leading-relaxed text-muted-foreground">{shortDescription}</p>}

          {factChips.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {factChips.map((chip) => (
                <li key={chip} className="rounded-full bg-background px-4 py-2 text-sm font-medium text-foreground">
                  {chip}
                </li>
              ))}
            </ul>
          )}

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
        </div>
      </section>

      {/* About + specification (only the parts that have real content). */}
      {(fullDescription || product.ai_summary || hasSpecs) && (
        <section className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:py-20">
          {(fullDescription || product.ai_summary) && (
            <div className="flex flex-col gap-5">
              <h2 className="font-heading text-3xl font-semibold">About this tile</h2>
              {fullDescription && <p className="text-lg leading-relaxed text-muted-foreground">{fullDescription}</p>}
              {product.ai_summary && <AiSummaryCard summary={product.ai_summary} />}
            </div>
          )}
          {hasSpecs && (
            <div className="flex flex-col gap-4">
              <h2 className="font-heading text-3xl font-semibold">Specification</h2>
              <div className="rounded-2xl border border-border px-5 py-2 text-base">
                <SpecBlock product={product} />
              </div>
            </div>
          )}
        </section>
      )}

      {/* Sample CTA band */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-14 sm:px-6 lg:pb-20">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-border p-8 sm:p-10 md:flex-row md:items-center">
          <div className="flex max-w-xl flex-col gap-2">
            <h2 className="font-heading text-2xl font-semibold sm:text-3xl">Want to see it in your space?</h2>
            <p className="text-lg text-muted-foreground">
              Tell us your city and the area to cover. We reply on WhatsApp with a free sample and a bulk quote.
            </p>
          </div>
          <SampleRequestDialog productId={product.id} productName={product.name} label="Ask on WhatsApp" />
        </div>
      </section>

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

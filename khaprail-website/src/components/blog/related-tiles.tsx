import { Link } from "react-router-dom"
import { ProductCard } from "@/components/products/product-card"
import { useLinkableCategories } from "@/hooks/use-linkable-categories"
import { useProducts } from "@/hooks/use-products"
import { keywordsOf, overlap, postKeywords } from "@/lib/related-content"
import type { BlogPostWithFaqs } from "@/types/blog"

// "Explore the tiles in this guide" — internal links from a blog post to the
// categories and products it is actually about, matched on the post's real
// entity tags / category / title (lib/related-content.ts). Renders nothing
// when no category or product genuinely relates, and only ever links to
// categories that have products (useLinkableCategories), so a post never
// sends readers to an empty "coming soon" page.
export function RelatedTiles({ post }: { post: BlogPostWithFaqs }) {
  const { categories } = useLinkableCategories()
  const { products } = useProducts({}, "newest", null)

  const wanted = postKeywords(post)
  const categoryName = new Map(categories.map((c) => [c.id, c.name]))

  const relatedCategories = categories
    .map((c) => ({ category: c, score: overlap(wanted, keywordsOf(c.name)) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((x) => x.category)

  const relatedProducts = products
    .map((p) => ({ product: p, score: overlap(wanted, keywordsOf(p.name, p.category_id ? categoryName.get(p.category_id) : null)) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((x) => x.product)

  if (relatedCategories.length === 0 && relatedProducts.length === 0) return null

  return (
    <section aria-labelledby="related-tiles-heading" className="mt-12 border-t border-border pt-8">
      <h2 id="related-tiles-heading" className="font-heading text-3xl font-semibold">
        Explore the tiles in this guide
      </h2>
      {relatedCategories.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {relatedCategories.map((c) => (
            <li key={c.id}>
              <Link
                to={`/categories/${c.slug}`}
                className="inline-flex rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {relatedProducts.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-4">
          {relatedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  )
}

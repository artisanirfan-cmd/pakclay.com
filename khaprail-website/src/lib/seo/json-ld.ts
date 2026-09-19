import type { BlogPostWithFaqs } from "@/types/blog"
import type { ProductDetail } from "@/types/product"
import { SITE_NAME, SITE_URL } from "@/lib/site"
import { ORGANIZATION, ORGANIZATION_LOGO } from "@/lib/seo/organization"
import { shareImage } from "@/lib/seo/image"
import { cleanText, truncateAtWord } from "@/lib/seo/text"

// JSON-LD builders. Every value comes from real CMS/database fields — a
// property with no real value is OMITTED (never faked): e.g. no `offers` for
// a product with no price, no `author` Person for a post with no author.
// Text fields are run through cleanText() so Markdown syntax or placeholder
// copy can never leak into structured data.

/** Escapes "</" so embedded JSON can't prematurely close the <script> tag it's rendered into. */
export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/<\//g, "<\\/")
}

export interface Crumb {
  name: string
  path: string
}

export function breadcrumbJsonLd(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${SITE_URL}${c.path}`,
    })),
  }
}

const AVAILABILITY: Record<string, string> = {
  "in stock": "https://schema.org/InStock",
  "out of stock": "https://schema.org/OutOfStock",
  "pre-order": "https://schema.org/PreOrder",
  preorder: "https://schema.org/PreOrder",
  "limited availability": "https://schema.org/LimitedAvailability",
}

/**
 * Product node for a PDP. `offers` only when a real price exists. Returns
 * null for a product with no photo at all: `image` is required for a valid
 * Product, and inventing one would be fabricated data — the markup appears
 * as soon as a real photo is uploaded.
 */
export function productJsonLd(product: ProductDetail) {
  const images = [product.cover_image_url, ...product.product_images.map((i) => i.image_url)]
    .filter((u): u is string => !!u)
    .map((u) => shareImage(u, 1200))
    .filter((u): u is string => !!u)
  if (images.length === 0) return null
  const description =
    cleanText(product.description) ||
    [product.name, product.category_name ? `from our ${product.category_name} range` : null, product.size ? `(${product.size})` : null]
      .filter(Boolean)
      .join(" ")
  const url = `${SITE_URL}/products/${product.slug}`
  const additionalProperty = (
    [
      ["Size", product.size],
      ["Thickness", product.thickness],
      ["Finish", product.finish],
    ] as const
  )
    .filter(([, v]) => !!v)
    .map(([name, value]) => ({ "@type": "PropertyValue", name, value }))

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.name,
    url,
    image: Array.from(new Set(images)),
    description: truncateAtWord(description, 500),
    sku: product.sku || undefined,
    category: product.category_name || undefined,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    manufacturer: product.manufacturer ? { "@type": "Organization", name: product.manufacturer } : undefined,
    countryOfOrigin: product.country_of_origin ? { "@type": "Country", name: product.country_of_origin } : undefined,
    additionalProperty: additionalProperty.length > 0 ? additionalProperty : undefined,
    offers:
      product.price != null
        ? {
            "@type": "Offer",
            url,
            price: product.price,
            priceCurrency: "PKR",
            availability: AVAILABILITY[(product.availability ?? "").toLowerCase()] ?? undefined,
            itemCondition: "https://schema.org/NewCondition",
          }
        : undefined,
  }
}

function wordCount(markdown: string | null): number | undefined {
  const words = cleanText(markdown).split(/\s+/).filter(Boolean).length
  return words > 0 ? words : undefined
}

/** BlogPosting for a post (06-BLOG-CMS-SPEC.md). No `articleBody`: the page already carries the text. */
export function blogPostingJsonLd(post: BlogPostWithFaqs) {
  const url = `${SITE_URL}/blog/${post.slug}`
  const description = truncateAtWord(cleanText(post.meta_description) || cleanText(post.excerpt) || cleanText(post.answer_box), 300)
  const image = shareImage(post.cover_image_url, 675)
  const publisher = {
    "@type": "Organization",
    name: ORGANIZATION.name,
    url: SITE_URL,
    logo: { "@type": "ImageObject", url: ORGANIZATION_LOGO, width: 512, height: 512 },
  }
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    headline: truncateAtWord(cleanText(post.meta_title) || cleanText(post.title), 110),
    description: description || undefined,
    image: image ? [image] : undefined,
    datePublished: post.published_at || undefined,
    // `blog_posts` has no updated_at column, so the publish date is the only real date.
    dateModified: post.published_at || undefined,
    // No author recorded -> the publisher itself is the author (never an invented Person).
    author: post.author ? { "@type": "Person", name: post.author } : publisher,
    publisher,
    inLanguage: "en",
    articleSection: post.category?.trim() || undefined,
    keywords: post.entity_tags.length > 0 ? post.entity_tags.join(", ") : undefined,
    wordCount: wordCount(post.content),
    timeRequired: post.read_time_minutes ? `PT${post.read_time_minutes}M` : undefined,
    isPartOf: { "@type": "Blog", name: `${SITE_NAME} Blog`, url: `${SITE_URL}/blog` },
  }
}

/** FAQPage from the FAQs tab; null when there are no real Q&A pairs. */
export function faqJsonLd(post: BlogPostWithFaqs) {
  const faqs = post.blog_faqs
    .map((faq) => ({ q: cleanText(faq.question), a: cleanText(faq.answer) }))
    .filter((faq) => faq.q && faq.a)
  if (faqs.length === 0) return null
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  }
}

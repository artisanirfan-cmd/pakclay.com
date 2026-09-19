import { useEffect } from "react"
import { HERO_IMAGE_JPG } from "@/lib/hero-image"
import { SITE_URL, SITE_NAME } from "@/lib/site"

// SEO batch C (2026-09-10, see 00-PROGRESS.md): this app had zero per-page
// <title>/<meta description>/canonical/Open Graph/Twitter Card handling —
// every route showed the same generic "khaprail-website" title. This hook
// is the one place every page sets its own real, unique values. It runs
// client-side (a plain useEffect, not a server head-manager), which is
// enough for two reasons: (1) it also keeps the <head> correct across
// client-side route changes, which a build-time-only fix couldn't do —
// React Router never reloads the page, so whatever the *previous* route's
// prerendered HTML put in <head> would otherwise stick around; (2) Batch
// B's prerender script (scripts/prerender.mjs) waits for the page to fully
// settle before snapshotting HTML, so this effect has already run and its
// output is captured in the real static HTML crawlers receive — this
// isn't a client-only fix that non-JS crawlers miss.

export { SITE_URL, SITE_NAME }
const DEFAULT_OG_IMAGE = `${SITE_URL}${HERO_IMAGE_JPG}`

export interface DocumentHeadOptions {
  /** Page-specific part only — " | PAKCLAY.COM" is appended (unless `fullTitle`). Aim for <= ~45 chars. */
  title: string
  /** Use `title` exactly as given (homepage), without appending the site name. */
  fullTitle?: boolean
  /** Real, compelling, ~120-155 chars. Never invented/generic filler. */
  description: string
  /** Path only, e.g. "/products/flat-tile" — used for canonical + og:url. */
  path: string
  /** ABSOLUTE url of a real per-page photo when one exists; falls back to the site's hero photo. */
  image?: string | null
  /** Alt text for the share image (og:image:alt / twitter:image:alt). */
  imageAlt?: string
  type?: "website" | "article" | "product"
  /** Adds `<meta name="robots" content="noindex, follow">` (thin / utility pages). */
  noindex?: boolean
  /** article:* tags for blog posts (ISO 8601). */
  article?: { publishedTime?: string | null; modifiedTime?: string | null; section?: string | null; tags?: string[] }
  /** product:* tags — only pass a price when it is real. */
  product?: { priceAmount?: number | null; priceCurrency?: string }
}

// Optional tags that must be REMOVED again when a page does not supply them,
// otherwise a product page's tags would linger after navigating to another.
const OPTIONAL_PROPERTIES = [
  "og:image:alt",
  "article:published_time",
  "article:modified_time",
  "article:section",
  "article:tag",
  "product:price:amount",
  "product:price:currency",
]
const OPTIONAL_NAMES = ["twitter:image:alt", "robots"]

function removeMeta(selector: string) {
  document.head.querySelectorAll(selector).forEach((el) => el.remove())
}

function upsertMetaByName(name: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (!el) {
    el = document.createElement("meta")
    el.setAttribute("name", name)
    document.head.appendChild(el)
  }
  el.setAttribute("content", content)
}

function upsertMetaByProperty(property: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)
  if (!el) {
    el = document.createElement("meta")
    el.setAttribute("property", property)
    document.head.appendChild(el)
  }
  el.setAttribute("content", content)
}

function addMetaByProperty(property: string, content: string) {
  const el = document.createElement("meta")
  el.setAttribute("property", property)
  el.setAttribute("content", content)
  document.head.appendChild(el)
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement("link")
    el.setAttribute("rel", "canonical")
    document.head.appendChild(el)
  }
  el.setAttribute("href", href)
}

/**
 * Sets this page's real <title>, meta description, canonical, Open Graph and
 * Twitter Card tags. Pass `null` while the page's data is still loading to
 * leave the head untouched (avoids flashing placeholder text). Runs
 * client-side in an effect; the build-time prerender waits for the page to
 * settle before snapshotting, so the values are in the static HTML crawlers
 * receive too.
 */
export function useDocumentHead(options: DocumentHeadOptions | null) {
  const key = options ? JSON.stringify(options) : "null"
  useEffect(() => {
    if (!options) return
    const { title, fullTitle, description, path, image, imageAlt, type = "website", noindex, article, product } = options
    const finalTitle = fullTitle ? title : `${title} | ${SITE_NAME}`
    const url = `${SITE_URL}${path}`
    const resolvedImage = image || DEFAULT_OG_IMAGE

    document.title = finalTitle
    upsertCanonical(url)
    upsertMetaByName("description", description)
    upsertMetaByProperty("og:title", finalTitle)
    upsertMetaByProperty("og:description", description)
    upsertMetaByProperty("og:url", url)
    upsertMetaByProperty("og:type", type)
    upsertMetaByProperty("og:site_name", SITE_NAME)
    upsertMetaByProperty("og:locale", "en_PK")
    upsertMetaByProperty("og:image", resolvedImage)
    upsertMetaByName("twitter:card", "summary_large_image")
    upsertMetaByName("twitter:title", finalTitle)
    upsertMetaByName("twitter:description", description)
    upsertMetaByName("twitter:image", resolvedImage)

    for (const prop of OPTIONAL_PROPERTIES) removeMeta(`meta[property="${prop}"]`)
    for (const name of OPTIONAL_NAMES) removeMeta(`meta[name="${name}"]`)
    if (imageAlt) {
      upsertMetaByProperty("og:image:alt", imageAlt)
      upsertMetaByName("twitter:image:alt", imageAlt)
    }
    if (noindex) upsertMetaByName("robots", "noindex, follow")
    if (article?.publishedTime) upsertMetaByProperty("article:published_time", article.publishedTime)
    if (article?.modifiedTime) upsertMetaByProperty("article:modified_time", article.modifiedTime)
    if (article?.section) upsertMetaByProperty("article:section", article.section)
    for (const tag of article?.tags ?? []) addMetaByProperty("article:tag", tag)
    if (product?.priceAmount != null) {
      upsertMetaByProperty("product:price:amount", String(product.priceAmount))
      upsertMetaByProperty("product:price:currency", product.priceCurrency ?? "PKR")
    }
    // `key` (a JSON fingerprint of the options) is the dependency, so an
    // inline options object literal doesn't re-run the effect every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}

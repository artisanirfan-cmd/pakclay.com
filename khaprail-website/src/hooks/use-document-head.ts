import { useEffect } from "react"
import { HERO_IMAGE_JPG } from "@/lib/hero-image"

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

export const SITE_URL = "https://khaprail.vercel.app"
export const SITE_NAME = "PAKCLAY.COM"
const DEFAULT_OG_IMAGE = `${SITE_URL}${HERO_IMAGE_JPG}`

export interface DocumentHeadOptions {
  /** Page-specific part only — the site name is appended automatically. */
  title: string
  /** Real, compelling, ~120-155 chars. Never invented/generic filler. */
  description: string
  /** Path only, e.g. "/products/flat-tile" — used for canonical + og:url. */
  path: string
  /** Real per-page photo when one exists; falls back to the site's hero photo. */
  image?: string | null
  type?: "website" | "article" | "product"
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

function upsertCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement("link")
    el.setAttribute("rel", "canonical")
    document.head.appendChild(el)
  }
  el.setAttribute("href", href)
}

export function useDocumentHead({ title, description, path, image, type = "website" }: DocumentHeadOptions) {
  useEffect(() => {
    const fullTitle = `${title} | ${SITE_NAME}`
    const url = `${SITE_URL}${path}`
    const resolvedImage = image || DEFAULT_OG_IMAGE

    document.title = fullTitle
    upsertCanonical(url)
    upsertMetaByName("description", description)
    upsertMetaByProperty("og:title", fullTitle)
    upsertMetaByProperty("og:description", description)
    upsertMetaByProperty("og:url", url)
    upsertMetaByProperty("og:type", type)
    upsertMetaByProperty("og:site_name", SITE_NAME)
    upsertMetaByProperty("og:image", resolvedImage)
    upsertMetaByName("twitter:card", "summary_large_image")
    upsertMetaByName("twitter:title", fullTitle)
    upsertMetaByName("twitter:description", description)
    upsertMetaByName("twitter:image", resolvedImage)
  }, [title, description, path, image, type])
}

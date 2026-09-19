import { createClient } from "@supabase/supabase-js"
import type { Request as ExpressRequest, Response as ExpressResponse } from "express"
import { sendFetchResponse } from "../lib/fetch-adapter.js"
import { getSiteUrl } from "../lib/site.js"

// Express route handler for GET /sitemap.xml.
//
// Ported from the original Vercel Function at api/sitemap.ts, which was
// reachable at the real /sitemap.xml path via a vercel.json rewrite (that
// rewrite is gone now that vercel.json is gone — this route is mounted at
// /sitemap.xml directly in server/index.ts instead). Logic is unchanged.
//
// SEO batch B (2026-09-10, see 00-PROGRESS.md): generated live, at request
// time, from the real `categories`/`products`/`blog_posts` tables — not a
// static file baked in at build time. A static sitemap would go stale
// between deploys every time an admin adds a product/category/post via
// `/admin/*`, since nothing here redeploys on a database change, only on a
// git push. Uses the public anon/publishable key — every table read here
// already has a public-read RLS policy (same data `useCategories`/
// `useProducts`/`useBlogPosts` already expose to every visitor).

interface SitemapEntry {
  path: string
  lastmod?: string
}

const STATIC_ENTRIES: SitemapEntry[] = [
  { path: "/" },
  { path: "/about" },
  { path: "/categories" },
  { path: "/products" },
  { path: "/new-arrivals" },
  { path: "/best-sellers" },
  { path: "/videos" },
  { path: "/downloads" },
  { path: "/blog" },
  { path: "/contact" },
]

function buildClient() {
  const url = process.env.VITE_SUPABASE_URL
  const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !publishableKey) return null
  return createClient(url, publishableKey)
}

function xmlEscape(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function urlTag({ path, lastmod }: SitemapEntry): string {
  const loc = xmlEscape(`${getSiteUrl()}${path}`)
  const lastmodTag = lastmod ? `<lastmod>${xmlEscape(lastmod)}</lastmod>` : ""
  return `  <url><loc>${loc}</loc>${lastmodTag}</url>`
}

async function buildSitemapXml(): Promise<string> {
  const entries: SitemapEntry[] = [...STATIC_ENTRIES]

  const client = buildClient()
  if (client) {
    const [{ data: categories }, { data: products }, { data: posts }, { data: videos }] = await Promise.all([
      client.from("categories").select("id, slug, parent_id"),
      client.from("products").select("slug, created_at, category_id"),
      client.from("blog_posts").select("slug, published_at").eq("status", "published"),
      client.from("videos").select("id").limit(1),
    ])

    // Keep the sitemap consistent with the pages' own robots signals: the
    // client marks /videos and product-less categories `noindex` (thin
    // "coming soon" pages), and a sitemap must not list noindex URLs. Each
    // check FAILS OPEN (lists the URL) if its query returned no data.
    if (videos && videos.length === 0) {
      const i = entries.findIndex((e) => e.path === "/videos")
      if (i !== -1) entries.splice(i, 1)
    }

    // Product count per category INCLUDING descendants (a root category shows
    // its children's products — see category-detail's getDescendantCategoryIds).
    const children = new Map<string, string[]>()
    for (const c of categories ?? []) {
      if (c.parent_id) children.set(c.parent_id, [...(children.get(c.parent_id) ?? []), c.id])
    }
    const direct = new Map<string, number>()
    for (const p of products ?? []) if (p.category_id) direct.set(p.category_id, (direct.get(p.category_id) ?? 0) + 1)
    const total = (id: string, seen = new Set<string>()): number => {
      if (seen.has(id)) return 0
      seen.add(id)
      return (direct.get(id) ?? 0) + (children.get(id) ?? []).reduce((sum, child) => sum + total(child, seen), 0)
    }

    for (const c of categories ?? []) {
      if (products && total(c.id) === 0) continue
      entries.push({ path: `/categories/${c.slug}` })
    }
    for (const p of products ?? []) {
      entries.push({ path: `/products/${p.slug}`, lastmod: p.created_at?.slice(0, 10) })
    }
    for (const post of posts ?? []) {
      entries.push({ path: `/blog/${post.slug}`, lastmod: post.published_at?.slice(0, 10) })
    }
  }

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    entries.map(urlTag).join("\n") +
    `\n</urlset>\n`
  )
}

async function handleSitemapFetch(): Promise<Response> {
  try {
    const xml = await buildSitemapXml()
    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      },
    })
  } catch (err) {
    return Response.json({ error: "server_error", detail: (err as Error).message }, { status: 500 })
  }
}

export async function sitemapHandler(_req: ExpressRequest, res: ExpressResponse): Promise<void> {
  const fetchResponse = await handleSitemapFetch()
  await sendFetchResponse(fetchResponse, res)
}

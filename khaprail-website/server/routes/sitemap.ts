import { createClient } from "@supabase/supabase-js"
import type { Request as ExpressRequest, Response as ExpressResponse } from "express"
import { sendFetchResponse } from "../lib/fetch-adapter.js"

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

const SITE_URL = "https://khaprail.vercel.app"

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
  const loc = xmlEscape(`${SITE_URL}${path}`)
  const lastmodTag = lastmod ? `<lastmod>${xmlEscape(lastmod)}</lastmod>` : ""
  return `  <url><loc>${loc}</loc>${lastmodTag}</url>`
}

async function buildSitemapXml(): Promise<string> {
  const entries: SitemapEntry[] = [...STATIC_ENTRIES]

  const client = buildClient()
  if (client) {
    const [{ data: categories }, { data: products }, { data: posts }] = await Promise.all([
      client.from("categories").select("slug"),
      client.from("products").select("slug, created_at"),
      client.from("blog_posts").select("slug, published_at").eq("status", "published"),
    ])
    for (const c of categories ?? []) entries.push({ path: `/categories/${c.slug}` })
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

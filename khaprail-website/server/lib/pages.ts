import { readFileSync } from "node:fs"
import { stat } from "node:fs/promises"
import path from "node:path"
import type { NextFunction, Request, Response } from "express"
import { getSiteUrl } from "./site.js"

// Serves every HTML page (everything that is not a real static file such as
// /assets/*, fonts or icons) with correct crawler-facing semantics:
//
//  * ONE canonical URL per page, WITHOUT a trailing slash (what React Router,
//    the sitemap and the canonical <link> all use). `/products/` and
//    `/products/index.html` 301 to it; previously every page 301-redirected the
//    OTHER way (express.static's directory redirect), so the canonical tag,
//    the sitemap and the URL Google fetched all disagreed.
//  * Prerendered pages (dist/<route>/index.html, written at build time) are
//    served directly at their canonical URL with a 200.
//  * A product/category/blog URL that is not prerendered (e.g. added in the
//    admin after the last build) is checked against live Supabase data: real
//    -> the clean SPA shell with a per-URL canonical (200); unknown -> a real
//    404 (it used to be a 200 "soft 404" showing the homepage). If Supabase
//    cannot be reached the request FAILS OPEN (200) so an outage can never
//    make valid pages 404.
//  * Anything else is a real 404. /admin/* and /search are noindex.

type Kind = "products" | "categories" | "blog"

const TABLE: Record<Kind, { table: string; extra: string }> = {
  products: { table: "products", extra: "" },
  categories: { table: "categories", extra: "" },
  blog: { table: "blog_posts", extra: "&status=eq.published" },
}

const POSITIVE_TTL_MS = 10 * 60 * 1000
const NEGATIVE_TTL_MS = 2 * 60 * 1000
const cache = new Map<string, { exists: boolean; expires: number }>()

/** true = exists, false = definitely not found, null = could not determine (fail open). */
async function slugExists(kind: Kind, slug: string): Promise<boolean | null> {
  const key = `${kind}:${slug}`
  const hit = cache.get(key)
  if (hit && hit.expires > Date.now()) return hit.exists

  const base = process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!base || !anonKey) return null
  const { table, extra } = TABLE[kind]
  try {
    const res = await fetch(`${base}/rest/v1/${table}?select=id&slug=eq.${encodeURIComponent(slug)}${extra}&limit=1`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return null
    const rows = (await res.json()) as unknown[]
    const exists = Array.isArray(rows) && rows.length > 0
    cache.set(key, { exists, expires: Date.now() + (exists ? POSITIVE_TTL_MS : NEGATIVE_TTL_MS) })
    return exists
  } catch {
    return null
  }
}

function withQuery(pathname: string, req: Request): string {
  const i = req.originalUrl.indexOf("?")
  return i === -1 ? pathname : pathname + req.originalUrl.slice(i)
}

export function createPageHandler(distDir: string) {
  // The pristine Vite shell (no canonical, no route content), saved by
  // scripts/prerender.mjs. dist/index.html is the prerendered HOMEPAGE, so it
  // must never be used as the fallback for other URLs.
  let shell: string | null = null
  const readShell = (): string => {
    if (shell !== null) return shell
    try {
      shell = readFileSync(path.join(distDir, "_shell.html"), "utf8")
    } catch {
      console.warn("[pages] dist/_shell.html missing — falling back to dist/index.html (run the prerender build step)")
      shell = readFileSync(path.join(distDir, "index.html"), "utf8")
    }
    return shell
  }

  function sendShell(res: Response, status: number, opts: { canonicalPath?: string; robots?: string } = {}): void {
    let html = readShell()
    if (opts.canonicalPath) {
      const tag = `<link rel="canonical" href="${getSiteUrl()}${opts.canonicalPath}" />`
      html = html.replace("</head>", `    ${tag}\n  </head>`)
    }
    if (opts.robots) res.set("X-Robots-Tag", opts.robots)
    res.status(status).type("html").set("Cache-Control", "no-cache").send(html)
  }

  return async function pageHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (req.method !== "GET" && req.method !== "HEAD") return next()
    if (req.path.startsWith("/api/")) return next()

    let pathname: string
    try {
      pathname = decodeURIComponent(req.path)
    } catch {
      res.status(400).type("text/plain").send("Bad request")
      return
    }
    if (pathname.includes("\0") || pathname.split("/").includes("..")) {
      res.status(400).type("text/plain").send("Bad request")
      return
    }

    // /products/ -> /products ; /index.html and /x/index.html -> /x
    if (pathname.length > 1 && pathname.endsWith("/")) {
      res.redirect(301, withQuery(pathname.replace(/\/+$/, ""), req))
      return
    }

    // Admin: the SPA shell, never indexed.
    if (pathname === "/admin" || pathname.startsWith("/admin/")) {
      sendShell(res, 200, { robots: "noindex, nofollow" })
      return
    }

    // Prerendered page for this exact route?
    const file = pathname === "/" ? path.join(distDir, "index.html") : path.join(distDir, pathname, "index.html")
    if (file.startsWith(distDir)) {
      try {
        if ((await stat(file)).isFile()) {
          if (pathname === "/search") res.set("X-Robots-Tag", "noindex, follow")
          res.status(200).set("Cache-Control", "no-cache").sendFile(file)
          return
        }
      } catch {
        // not prerendered — fall through
      }
    }

    // A real-looking dynamic URL that was not prerendered: verify it live.
    const match = /^\/(products|categories|blog)\/([^/]+)$/.exec(pathname)
    if (match) {
      const exists = await slugExists(match[1] as Kind, match[2])
      if (exists === false) {
        sendShell(res, 404, { robots: "noindex" })
        return
      }
      sendShell(res, 200, { canonicalPath: pathname })
      return
    }

    // Everything else is a genuine 404 (the client renders its NotFound page).
    sendShell(res, 404, { robots: "noindex" })
  }
}

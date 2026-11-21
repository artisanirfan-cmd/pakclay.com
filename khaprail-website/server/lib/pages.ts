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

// Server-side <head> for pages that were NOT prerendered (e.g. the hosting
// build skipped the Chromium prerender step). Mirrors what each page's
// useDocumentHead() sets client-side, so a crawler that does not run
// JavaScript still gets a real title/description/canonical. The client hook
// upserts the same tags, so there are no duplicates once the app boots.
interface HeadMeta {
  title: string
  description: string
  path: string
  image?: string | null
  type?: "website" | "article" | "product"
  noindex?: boolean
}

const SITE_NAME = "PAKCLAY.COM"

const STATIC_META: Record<string, { title: string; description: string; full?: boolean }> = {
  "/": {
    title: "Pak Clay Industry Terracotta Khaprail Tiles Manufacturer in Pakistan",
    full: true,
    description:
      "Khaprail Tiles has made clay roof tiles, Multani tiles and terracotta flooring in Lahore since 1982. Browse the range and request a free sample.",
  },
  "/about": {
    title: "About Us — Clay Tile Makers Since 1982",
    description:
      "Since 1982, our Lahore workshop has shaped clay roof tiles, Multani tiles and terracotta flooring. Learn about our craft and our tile range.",
  },
  "/categories": {
    title: "Tile Categories — Roof, Floor, Wall & Outdoor",
    description:
      "Explore our tile categories: roof, floor, wall, outdoor, kitchen and bathroom tiles in clay, terracotta, stone and concrete, plus terracotta jali.",
  },
  "/products": {
    title: "Shop All Tiles — Roof, Floor & Wall Tiles",
    description:
      "Browse every clay roof tile, terracotta floor tile, Multani tile and stone wall tile we offer. Filter by type, pattern, material, finish and color.",
  },
  "/new-arrivals": {
    title: "New Arrivals — Latest Tiles Added",
    description:
      "See the newest clay, terracotta and stone tiles added to our range, listed newest first. Request a free sample of any tile.",
  },
  "/best-sellers": {
    title: "Best Sellers — Most Requested Tiles",
    description:
      "Our most-requested tiles, ranked from real customer sample requests. See which clay and terracotta tiles people ask for most, and request a sample.",
  },
  "/videos": {
    title: "Videos — Our Tiles Being Made & Installed",
    description:
      "Watch videos of our workshop, our tile-making process and tile installations from our Lahore tile makers.",
  },
  "/downloads": {
    title: "Downloads — Tile Catalog & Spec Sheets",
    description:
      "Download our full tile catalog or a spec sheet for any tile as a PDF, generated live from our current product range.",
  },
  "/blog": {
    title: "Blog — Tile Guides, Stories & Updates",
    description:
      "Guides, stories and updates about clay roof tiles, Multani tiles and terracotta flooring from our Lahore tile makers.",
  },
  "/contact": {
    title: "Contact & Locations — Lahore and Islamabad",
    description:
      "Call, email or WhatsApp us about clay and terracotta tiles. Visit our Lahore head office on Walton Road or our Islamabad location in Gulberg Greens.",
  },
  "/search": {
    title: "Search Tiles",
    description: "Search our clay, terracotta and stone tile range.",
  },
}

const escAttr = (v: string): string => v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")
const escText = (v: string): string => v.replace(/&/g, "&amp;").replace(/</g, "&lt;")

function truncate(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max - 1)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 40))}…`
}

/** Replace the shell's <title> and add canonical / description / Open Graph tags. */
function injectHead(html: string, meta: HeadMeta, fullTitle = false): string {
  const site = getSiteUrl()
  const title = fullTitle ? meta.title : `${meta.title} | ${SITE_NAME}`
  const url = `${site}${meta.path === "/" ? "" : meta.path}` || site
  const canonical = meta.path === "/" ? `${site}/` : url
  const tags = [
    `<link rel="canonical" href="${escAttr(canonical)}" />`,
    `<meta name="description" content="${escAttr(meta.description)}" />`,
    `<meta property="og:title" content="${escAttr(title)}" />`,
    `<meta property="og:description" content="${escAttr(meta.description)}" />`,
    `<meta property="og:url" content="${escAttr(canonical)}" />`,
    `<meta property="og:type" content="${meta.type ?? "website"}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:locale" content="en_PK" />`,
    meta.image ? `<meta property="og:image" content="${escAttr(meta.image)}" />` : "",
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escAttr(title)}" />`,
    `<meta name="twitter:description" content="${escAttr(meta.description)}" />`,
    meta.image ? `<meta name="twitter:image" content="${escAttr(meta.image)}" />` : "",
    meta.noindex ? `<meta name="robots" content="noindex, follow" />` : "",
  ]
    .filter(Boolean)
    .map((t) => `    ${t}`)
    .join("\n")
  let out = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escText(title)}</title>`)
  out = out.replace("</head>", `${tags}\n  </head>`)
  return out
}

const TABLE: Record<Kind, { table: string; extra: string; columns: string }> = {
  products: { table: "products", extra: "", columns: "id,name,size,cover_image_url" },
  categories: { table: "categories", extra: "", columns: "id,name,cover_image_url" },
  blog: { table: "blog_posts", extra: "&status=eq.published", columns: "id,title,excerpt,meta_description,cover_image_url" },
}

const POSITIVE_TTL_MS = 10 * 60 * 1000
const NEGATIVE_TTL_MS = 2 * 60 * 1000
type Row = Record<string, string | null>
const cache = new Map<string, { exists: boolean; row: Row | null; expires: number }>()

/** exists=true (with its row) / false = definitely not found / null = could not determine (fail open). */
async function slugLookup(kind: Kind, slug: string): Promise<{ exists: boolean | null; row: Row | null }> {
  const key = `${kind}:${slug}`
  const hit = cache.get(key)
  if (hit && hit.expires > Date.now()) return { exists: hit.exists, row: hit.row }

  const base = process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!base || !anonKey) return { exists: null, row: null }
  const { table, extra, columns } = TABLE[kind]
  try {
    const res = await fetch(`${base}/rest/v1/${table}?select=${columns}&slug=eq.${encodeURIComponent(slug)}${extra}&limit=1`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return { exists: null, row: null }
    const rows = (await res.json()) as Row[]
    const exists = Array.isArray(rows) && rows.length > 0
    const row = exists ? rows[0] : null
    cache.set(key, { exists, row, expires: Date.now() + (exists ? POSITIVE_TTL_MS : NEGATIVE_TTL_MS) })
    return { exists, row }
  } catch {
    return { exists: null, row: null }
  }
}

function withQuery(pathname: string, req: Request): string {
  const i = req.originalUrl.indexOf("?")
  return i === -1 ? pathname : pathname + req.originalUrl.slice(i)
}

function headForRow(kind: Kind, pathname: string, row: Row): HeadMeta | null {
  const image = row.cover_image_url || null
  if (kind === "products" && row.name) {
    return {
      title: row.name,
      description: truncate(
        `${row.name} from ${SITE_NAME}${row.size ? `, size ${row.size}` : ""}. See photos and request a free sample.`,
        155,
      ),
      path: pathname,
      image,
      type: "product",
    }
  }
  if (kind === "categories" && row.name) {
    return {
      title: /tiles?\b/i.test(row.name) ? row.name : `${row.name} Tiles`,
      description: truncate(
        `Browse ${row.name} from ${SITE_NAME}. Filter by type, pattern, material, finish and color, then request a free sample.`,
        155,
      ),
      path: pathname,
      image,
    }
  }
  if (kind === "blog" && row.title) {
    return {
      title: row.title,
      description: truncate(row.meta_description || row.excerpt || `${row.title} — a guide from ${SITE_NAME}.`, 155),
      path: pathname,
      image,
      type: "article",
    }
  }
  return null
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

  function sendShell(
    res: Response,
    status: number,
    opts: { canonicalPath?: string; robots?: string; head?: HeadMeta; fullTitle?: boolean } = {},
  ): void {
    let html = readShell()
    if (opts.head) {
      html = injectHead(html, opts.head, opts.fullTitle)
    } else if (opts.canonicalPath) {
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
          // A real prerender carries its own canonical. dist/index.html of a
          // build whose prerender step was skipped is just the shell, so the
          // homepage falls through to the server-side head injection below.
          const prerendered = /rel="canonical"/.test(readFileSync(file, "utf8"))
          if (prerendered) {
            if (pathname === "/search") res.set("X-Robots-Tag", "noindex, follow")
            res.status(200).set("Cache-Control", "no-cache").sendFile(file)
            return
          }
        }
      } catch {
        // not prerendered — fall through
      }
    }

    // Known static page that was not prerendered: the real page, 200, with its
    // own head (these used to fall through to the 404 below).
    const staticMeta = STATIC_META[pathname]
    if (staticMeta) {
      const noindex = pathname === "/search"
      if (noindex) res.set("X-Robots-Tag", "noindex, follow")
      sendShell(res, 200, {
        head: { title: staticMeta.title, description: staticMeta.description, path: pathname, noindex },
        fullTitle: staticMeta.full,
      })
      return
    }

    // A real-looking dynamic URL that was not prerendered: verify it live.
    const match = /^\/(products|categories|blog)\/([^/]+)$/.exec(pathname)
    if (match) {
      const kind = match[1] as Kind
      const { exists, row } = await slugLookup(kind, match[2])
      if (exists === false) {
        sendShell(res, 404, { robots: "noindex" })
        return
      }
      const head = row ? headForRow(kind, pathname, row) : null
      sendShell(res, 200, head ? { head } : { canonicalPath: pathname })
      return
    }

    // Everything else is a genuine 404 (the client renders its NotFound page).
    sendShell(res, 404, { robots: "noindex" })
  }
}

// SEO batch B (2026-09-10, see 00-PROGRESS.md): this app was a pure
// client-side-rendered SPA with no prerendering at all — confirmed live,
// `curl`ing any real product/category page returned an empty
// `<body><div id="root"></div></body>` shell with a generic
// `<title>khaprail-website</title>` and no meta description/canonical tag.
// A crawler that doesn't execute JavaScript (Bing in many cases, WhatsApp/
// Facebook/X link-preview bots, most AI crawlers) saw nothing at all.
//
// This script runs after `vite build` (see package.json's `build` script)
// and generates real static HTML for every known route — every static page
// plus every product/category/published-blog-post slug, fetched live from
// Supabase at build time — by actually loading the already-working client
// app in headless Chrome (Puppeteer) and waiting for its real data fetches
// to settle, then snapshotting the fully-rendered DOM. This deliberately
// does NOT require rewriting this app's extensive useEffect+useState
// Supabase data-fetching pattern to a server-renderable form (e.g. React
// Router loaders) — a real headless browser runs real effects, so the
// existing hooks work completely unmodified.
//
// A `<link rel="canonical">` is injected into each snapshot's <head> here
// (Batch B's own explicit scope) since the client app itself doesn't set
// one yet. Per-page <title>/<meta description>/Open Graph/structured data
// are intentionally left as the generic shell for now — that's Batch C's
// job, and re-running this same script (which happens automatically on
// every build) is what will bake those in once Batch C adds them.

// Skip prerendering when explicitly opted out — e.g. a constrained CI/build
// sandbox where Puppeteer's Chromium (~280MB) can't launch, and the download
// attempt alone adds 60-90s of wasted build time before timing out. The SPA
// serves correctly without pre-rendered HTML; Google renders JS natively.
// Set SKIP_PRERENDER=1 in that build environment's env vars to skip.
if (process.env.SKIP_PRERENDER) {
  console.log("[prerender] Skipping — SKIP_PRERENDER env var set.")
  console.log("[prerender] Run `node scripts/prerender.mjs` locally/on the VPS to generate static HTML.")
  process.exit(0)
}

import { preview } from "vite"
import puppeteer from "puppeteer"
import { createClient } from "@supabase/supabase-js"
import { writeFile, mkdir } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

// This runs as a plain Node script, not through Vite, so it doesn't get
// .env loaded automatically — Vercel's build injects real env vars into
// process.env directly (no physical .env file there), so a missing local
// .env is expected/harmless in that environment.
try {
  process.loadEnvFile()
} catch {
  // No local .env file — fine if the vars are already in process.env (Vercel).
}

const ROOT = path.resolve(fileURLToPath(import.meta.url), "../..")
const DIST = path.join(ROOT, "dist")
const SITE_URL = "https://khaprail.vercel.app"

const STATIC_ROUTES = [
  "/",
  "/about",
  "/categories",
  "/products",
  "/new-arrivals",
  "/best-sellers",
  "/videos",
  "/downloads",
  "/blog",
  "/contact",
  "/search",
]

async function getDynamicRoutes() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) {
    console.warn("[prerender] No Supabase env vars at build time — skipping dynamic routes (categories/products/blog).")
    return []
  }
  const supabase = createClient(url, key)
  const [{ data: categories }, { data: products }, { data: posts }] = await Promise.all([
    supabase.from("categories").select("slug"),
    supabase.from("products").select("slug"),
    supabase.from("blog_posts").select("slug").eq("status", "published"),
  ])
  return [
    ...(categories ?? []).map((c) => `/categories/${c.slug}`),
    ...(products ?? []).map((p) => `/products/${p.slug}`),
    ...(posts ?? []).map((p) => `/blog/${p.slug}`),
  ]
}

function routeToFilePath(route) {
  if (route === "/") return path.join(DIST, "index.html")
  return path.join(DIST, route.replace(/^\//, ""), "index.html")
}

function injectCanonical(html, route) {
  const canonicalUrl = `${SITE_URL}${route === "/" ? "" : route}`
  const tag = `<link rel="canonical" href="${canonicalUrl}" />`
  if (html.includes('rel="canonical"')) return html
  return html.replace("</head>", `    ${tag}\n  </head>`)
}

async function main() {
  const dynamicRoutes = await getDynamicRoutes()
  const routes = [...STATIC_ROUTES, ...dynamicRoutes]
  console.log(`[prerender] Prerendering ${routes.length} routes (${STATIC_ROUTES.length} static + ${dynamicRoutes.length} dynamic)...`)

  const server = await preview({ preview: { port: 4321, strictPort: true, open: false } })
  const base = server.resolvedUrls.local[0]

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--single-process",
    ],
  })

  // Capture every route's HTML in memory first, and only write files to
  // `dist/` *after* the whole capture pass finishes and the preview server
  // is closed. Writing `dist/index.html` mid-loop was a real bug: `vite
  // preview`'s SPA fallback serves that exact file as the shell for every
  // other client-side route, so overwriting it after route 1 ("/") meant
  // every subsequent route's snapshot already "had" route 1's canonical
  // tag baked in from the served shell, and the de-dup guard below then
  // skipped adding the correct one — every page ended up with the
  // homepage's canonical URL. Caught by actually inspecting the output
  // files, not just checking the script exited 0.
  const results = []
  let failures = 0
  try {
    for (const route of routes) {
      const page = await browser.newPage()
      try {
        await page.goto(`${base}${route.replace(/^\//, "")}`, { waitUntil: "networkidle0", timeout: 30000 })
        // A short settle beyond network-idle for any state update React
        // batches right after the last fetch resolves (e.g. setLoading(false)
        // then a re-render on the next tick).
        await new Promise((resolve) => setTimeout(resolve, 300))
        const html = injectCanonical(await page.content(), route)
        results.push({ route, html })
      } catch (err) {
        failures++
        console.error(`[prerender] Failed to prerender ${route}:`, err instanceof Error ? err.message : err)
      } finally {
        await page.close()
      }
    }
  } finally {
    await browser.close()
    await server.close()
  }

  for (const { route, html } of results) {
    const filePath = routeToFilePath(route)
    await mkdir(path.dirname(filePath), { recursive: true })
    await writeFile(filePath, html)
  }

  if (failures > 0) {
    console.warn(`[prerender] ${failures}/${routes.length} route(s) failed — partial prerender complete.`)
    // Non-fatal: write the successful routes, skip the failed ones.
    return
  }
  console.log(`[prerender] Done — ${routes.length} routes prerendered to real static HTML.`)
}

try {
  await main()
} catch (err) {
  // Non-fatal: if Puppeteer/Chromium can't launch (common on Vercel's
  // build environment where the ~280MB Chromium binary may not install),
  // the build still succeeds — the SPA serves correctly without
  // prerendered HTML. Crawlers that execute JS still see full content.
  console.warn("[prerender] Skipping —", err instanceof Error ? err.message : err)
  console.warn("[prerender] Build continues with SPA fallback (no pre-rendered HTML).")
}

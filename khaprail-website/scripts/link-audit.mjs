// Internal-link audit of the PRERENDERED HTML in dist/ (what a crawler that
// does not run JavaScript sees). Run after a full `npm run build`:
//
//   node scripts/link-audit.mjs
//   node scripts/link-audit.mjs --verbose     # list every finding
//
// Reports: orphan pages (no contextual internal link from another page),
// broken internal links (target is not a real route), links INTO noindex pages
// (wasted crawl equity), link-URL variants that redirect (trailing slash /
// index.html), and click depth from the homepage. "Contextual" excludes
// site-wide chrome (links present on >= 80% of pages: header, footer, tab bar).
// Exits 1 on any hard problem. Used for batch 49 (Batch D) in 00-PROGRESS.md.
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const DIST = path.resolve(fileURLToPath(import.meta.url), "../../dist")
const VERBOSE = process.argv.includes("--verbose")
const ORIGINS = ["https://pakclay.com", "https://www.pakclay.com"]

async function walk(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "assets" || entry.name === "fonts") continue
      await walk(full, out)
    } else if (entry.name === "index.html") out.push(full)
  }
  return out
}

const pages = new Map() // route -> { html, noindex, links:Set }
for (const file of (await walk(DIST)).sort()) {
  const rel = path.relative(DIST, file).split(path.sep).join("/")
  const route = rel === "index.html" ? "/" : "/" + rel.replace(/\/index\.html$/, "")
  const html = await readFile(file, "utf8")
  pages.set(route, { html, noindex: /<meta name="robots" content="[^"]*noindex/.test(html), links: new Set(), raw: [] })
}

const NON_PAGE = /^\/(assets|fonts|api|admin)(\/|$)|^\/(favicon|apple-touch|robots\.txt|sitemap\.xml)/
const variants = []
for (const [route, page] of pages) {
  // only links in the page body/chrome, not <link> tags
  for (const m of page.html.matchAll(/<a\s[^>]*href="([^"]*)"/g)) {
    let href = m[1].replace(/&amp;/g, "&")
    for (const o of ORIGINS) if (href.startsWith(o)) href = href.slice(o.length) || "/"
    if (!href.startsWith("/") || href.startsWith("//")) continue // external, mailto:, tel:, #hash
    const [pathAndQuery] = href.split("#")
    const [p] = pathAndQuery.split("?")
    if (!p || NON_PAGE.test(p)) continue
    let norm = p
    if (norm.length > 1 && norm.endsWith("/")) { variants.push(`${route} -> ${p} (trailing slash, redirects)`); norm = norm.replace(/\/+$/, "") }
    if (/\/index\.html$/.test(norm)) { variants.push(`${route} -> ${p} (index.html, redirects)`); norm = norm.replace(/\/index\.html$/, "") || "/" }
    page.links.add(norm)
    page.raw.push(norm)
  }
}

const total = pages.size
const linkCount = new Map() // target -> number of DISTINCT source pages
for (const [route, page] of pages)
  for (const t of page.links) if (t !== route) linkCount.set(t, (linkCount.get(t) || 0) + 1)
const siteWide = new Set([...linkCount].filter(([, n]) => n >= total * 0.8).map(([t]) => t))

// contextual in-links: from another page, ignoring site-wide chrome links
const contextual = new Map()
const fromNames = new Map()
for (const [route, page] of pages)
  for (const t of page.links) {
    if (t === route || siteWide.has(t)) continue
    contextual.set(t, (contextual.get(t) || 0) + 1)
    fromNames.set(t, [...(fromNames.get(t) || []), route])
  }

const problems = []
const notes = []

// 1) broken internal links: target not a prerendered route (and not a dynamic route we cannot know is missing)
const broken = new Map()
for (const [route, page] of pages)
  for (const t of page.links)
    if (!pages.has(t)) broken.set(t, [...(broken.get(t) || []), route])
for (const [t, from] of broken) problems.push(`broken internal link -> ${t} (from ${from.length} page(s): ${from.slice(0, 3).join(", ")})`)

// 2) links into noindex pages (except site-wide utility links)
for (const [route, page] of pages)
  for (const t of page.links) {
    const target = pages.get(t)
    if (target?.noindex && !siteWide.has(t) && t !== "/search") problems.push(`${route} links to a noindex page: ${t}`)
  }

// 3) orphans: indexable pages with no contextual in-link (site-wide-only counts as linked from chrome)
const orphans = []
for (const [route, page] of pages) {
  if (route === "/" || page.noindex) continue
  const ctx = contextual.get(route) || 0
  const chrome = siteWide.has(route)
  if (ctx === 0 && !chrome) orphans.push(route)
  else if (ctx === 0 && chrome) notes.push(`${route}: linked only from site-wide navigation`)
}
for (const o of orphans) problems.push(`orphan page (no internal link from any other page): ${o}`)

// 4) click depth from the homepage (BFS over prerendered links)
const depth = new Map([["/", 0]])
const queue = ["/"]
while (queue.length) {
  const cur = queue.shift()
  for (const t of pages.get(cur)?.links ?? []) if (pages.has(t) && !depth.has(t)) { depth.set(t, depth.get(cur) + 1); queue.push(t) }
}
// noindex pages (empty categories, /search) are deliberately not linked from anywhere: only indexable pages must be reachable
const unreachable = [...pages.keys()].filter((r) => !depth.has(r) && !pages.get(r).noindex)
for (const r of unreachable) problems.push(`unreachable from the homepage by internal links: ${r}`)
const deliberatelyUnlinked = [...pages.keys()].filter((r) => !depth.has(r) && pages.get(r).noindex)
if (deliberatelyUnlinked.length) notes.push(`${deliberatelyUnlinked.length} noindex page(s) intentionally have no internal links (empty categories, search)`)

// blog posts must cross-link into the catalog (topical linking)
for (const [route, page] of pages) {
  if (!route.startsWith("/blog/")) continue
  const catalogLinks = [...page.links].filter((t) => t.startsWith("/products/") || t.startsWith("/categories/") )
  if (catalogLinks.length === 0) problems.push(`blog post has no link to any product or category page: ${route}`)
  else notes.push(`${route}: links to ${catalogLinks.length} catalog page(s)`)
}
// ...and the catalog should link back to posts that are about it
const postRoutes = [...pages.keys()].filter((r) => r.startsWith("/blog/"))
const linkedFromCatalog = new Set()
for (const [route, page] of pages) if (route.startsWith("/products/") || route.startsWith("/categories/")) for (const t of page.links) if (postRoutes.includes(t)) linkedFromCatalog.add(t)
for (const r of postRoutes) if (!linkedFromCatalog.has(r)) problems.push(`no product or category page links back to the blog post: ${r}`)
else notes.push(`${r}: linked from ${[...pages].filter(([k, pg]) => (k.startsWith("/products/") || k.startsWith("/categories/")) && pg.links.has(r)).length} catalog page(s)`)
const deep = [...depth].filter(([, d]) => d > 3)
for (const [r, d] of deep) problems.push(`click depth ${d} (> 3): ${r}`)

// 5) URL variants that redirect
const uniqVariants = [...new Set(variants)]
for (const v of uniqVariants.slice(0, 10)) problems.push(`internal link uses a redirecting URL variant: ${v}`)

// ---- report
const kinds = { product: 0, category: 0, blog: 0, other: 0 }
for (const r of pages.keys()) kinds[r.startsWith("/products/") ? "product" : r.startsWith("/categories/") ? "category" : r.startsWith("/blog/") ? "blog" : "other"]++
console.log(`Link audit of ${total} prerendered routes (${kinds.product} products, ${kinds.category} categories, ${kinds.blog} blog posts, ${kinds.other} other)\n`)
console.log(`site-wide chrome links (on >= 80% of pages): ${siteWide.size}`)
const maxDepth = Math.max(...depth.values())
console.log(`click depth from home: max ${maxDepth}; ${[...depth.values()].filter((d) => d === 1).length} pages at depth 1, ${[...depth.values()].filter((d) => d === 2).length} at depth 2, ${[...depth.values()].filter((d) => d >= 3).length} at depth 3+`)
const lowest = [...pages.keys()].filter((r) => !pages.get(r).noindex && r !== "/").map((r) => [r, (contextual.get(r) || 0) + (siteWide.has(r) ? 99 : 0)]).sort((a, b) => a[1] - b[1]).slice(0, 8)
console.log("least-linked indexable pages (contextual in-links):", lowest.map(([r, n]) => `${r}=${n >= 99 ? "chrome" : n}`).join(", "))
console.log(`\n${problems.length} problem(s)`)
const grouped = new Map()
for (const p of problems) { const k = p.replace(/[:>].*$/, "").replace(/\d+/g, "N"); grouped.set(k, (grouped.get(k) || 0) + 1) }
for (const [k, n] of [...grouped].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${k}`)
if (VERBOSE) { for (const p of problems) console.log("   ", p); for (const n of notes) console.log("   note:", n) }
process.exit(problems.length ? 1 : 0)

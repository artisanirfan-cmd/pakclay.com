// On-page SEO audit of the PRERENDERED HTML in dist/ — i.e. exactly what a
// crawler that does not run JavaScript receives for every route. Run after a
// full `npm run build` (which prerenders every route):
//
//   node scripts/seo-audit.mjs            # summary + every problem found
//   node scripts/seo-audit.mjs --routes   # also print one line per route
//
// Checks per route: <title> present/unique/length, meta description
// present/unique/length, one canonical, Open Graph + Twitter tags, JSON-LD
// parses and has the required properties for its @type, exactly one <h1>,
// no skipped heading levels, and image alt text. Exits 1 if any hard
// problem is found. Used for batch 48 (Batch C) in 00-PROGRESS.md.
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const DIST = path.resolve(fileURLToPath(import.meta.url), "../../dist")
const SHOW_ROUTES = process.argv.includes("--routes")

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

const decode = (v) =>
  v === undefined ? v : v.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
const attr = (tag, name) => decode((tag.match(new RegExp(`\\s${name}="([^"]*)"`)) || [])[1])
const metas = (html) => html.match(/<meta\s[^>]*>/g) || []
const metaContent = (html, key, val) => {
  const tag = metas(html).find((m) => attr(m, key) === val)
  return tag ? attr(tag, "content") : undefined
}

// Minimum required/recommended properties per schema.org type (Google's
// structured-data documentation), used as an offline validity check.
const REQUIRED = {
  Organization: ["name", "url"],
  WebSite: ["name", "url"],
  Product: ["name", "image", "description"],
  BlogPosting: ["headline", "image", "datePublished", "author"],
  Article: ["headline", "image", "datePublished", "author"],
  FAQPage: ["mainEntity"],
  BreadcrumbList: ["itemListElement"],
  CollectionPage: ["name"],
  ItemList: ["itemListElement"],
}

const problems = []
const titles = new Map()
const descriptions = new Map()
const rows = []

const files = (await walk(DIST)).sort()
for (const file of files) {
  const rel = path.relative(DIST, file).split(path.sep).join("/")
  const route = rel === "index.html" ? "/" : "/" + rel.replace(/\/index\.html$/, "")
  const html = await readFile(file, "utf8")
  const issues = []
  const add = (msg) => { issues.push(msg); problems.push(`${route}: ${msg}`) }

  // Build-machine URLs baked into the snapshot (e.g. the prerender preview
  // server's http://localhost:4321) would make every visitor's browser fail requests.
  if (/localhost|127\.0\.0\.1/.test(html)) add("contains a localhost URL (build-server origin leaked into the HTML)")

  // Chunks kept off the critical path on purpose (chat widget, PDF engine/buttons) must not be preloaded.
  const badPreload = (html.match(/<link[^>]*rel="modulepreload"[^>]*>/g) || []).filter((t) => /ai-chat|deferred-chat|react-pdf|download-catalog|download-spec/i.test(t))
  if (badPreload.length) add(`${badPreload.length} modulepreload link(s) for deliberately deferred chunks`)

  const titleTags = html.match(/<title>[^<]*<\/title>/g) || []
  const title = decode((titleTags[0] || "").replace(/<\/?title>/g, ""))
  if (titleTags.length !== 1) add(`${titleTags.length} <title> tags`)
  else if (title.length < 20 || title.length > 65) add(`title length ${title.length} (want 20-65): "${title}"`)
  if (title === "PAKCLAY.COM") add("generic title (bare site name)")
  titles.set(title, [...(titles.get(title) || []), route])

  const description = metaContent(html, "name", "description")
  if (!description) add("no meta description")
  else {
    if (description.length < 70 || description.length > 165) add(`description length ${description.length} (want 70-165)`)
    descriptions.set(description, [...(descriptions.get(description) || []), route])
  }

  const canonicals = html.match(/<link[^>]*rel="canonical"[^>]*>/g) || []
  if (canonicals.length !== 1) add(`${canonicals.length} canonical tags`)
  else {
    const href = attr(canonicals[0], "href") || ""
    const expected = "https://pakclay.com" + (route === "/" ? "/" : route)
    if (href !== expected) add(`canonical "${href}" (expected ${expected})`)
  }

  const isNoindex = /noindex/.test(metaContent(html, "name", "robots") || "")
  if (!isNoindex) {
    for (const p of ["og:title", "og:description", "og:url", "og:type", "og:image", "og:site_name"])
      if (!metaContent(html, "property", p)) add(`missing ${p}`)
    for (const n of ["twitter:card", "twitter:title", "twitter:description", "twitter:image"])
      if (!metaContent(html, "name", n)) add(`missing ${n}`)
    const ogImage = metaContent(html, "property", "og:image") || ""
    if (ogImage && !/^https?:\/\//.test(ogImage)) add(`og:image is not absolute: ${ogImage}`)
  }

  // JSON-LD
  const types = []
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    let data
    try { data = JSON.parse(m[1]) } catch (e) { add(`JSON-LD does not parse: ${e.message}`); continue }
    for (const node of Array.isArray(data) ? data : [data]) {
      const t = node["@type"]
      types.push(t)
      for (const key of REQUIRED[t] || []) {
        const v = node[key]
        if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) add(`${t} JSON-LD missing "${key}"`)
      }
      if (JSON.stringify(node).match(/(^|[^\w])(#{2,}\s|\*\*[^*]+\*\*)/)) add(`${t} JSON-LD contains raw Markdown syntax`)
    }
  }

  // Headings
  const headings = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]))
  const h1s = headings.filter((h) => h === 1).length
  if (h1s !== 1 && !isNoindex) add(`${h1s} <h1> elements`)
  for (let i = 1; i < headings.length; i++)
    if (headings[i] - headings[i - 1] > 1) { add(`heading level jumps h${headings[i - 1]} -> h${headings[i]}`); break }

  // Images: every <img> must carry an alt attribute; flag empty alt on likely-informative images
  const imgs = html.match(/<img\s[^>]*>/g) || []
  const noAlt = imgs.filter((i) => attr(i, "alt") === undefined).length
  if (noAlt) add(`${noAlt} <img> without an alt attribute`)
  const emptyAlt = imgs.filter((i) => attr(i, "alt") === "" && attr(i, "aria-hidden") !== "true").length

  rows.push({ route, title, description: description || "", types: types.join(","), h1s, imgs: imgs.length, emptyAlt, issues: issues.length })
}

for (const [t, rts] of titles) if (t && rts.length > 1) problems.push(`duplicate title "${t}" on ${rts.length} routes: ${rts.slice(0, 4).join(", ")}${rts.length > 4 ? "…" : ""}`)
for (const [d, rts] of descriptions) if (rts.length > 1) problems.push(`duplicate description on ${rts.length} routes: ${rts.slice(0, 4).join(", ")}${rts.length > 4 ? "…" : ""} ("${d.slice(0, 50)}…")`)

console.log(`SEO audit of ${rows.length} prerendered routes in dist/\n`)
if (SHOW_ROUTES) for (const r of rows) console.log(`${r.issues ? "!" : " "} ${r.route.padEnd(58)} h1=${r.h1s} imgs=${r.imgs}(empty-alt ${r.emptyAlt}) ld=[${r.types}] "${r.title.slice(0, 44)}"`)

// Summarise issues by kind (route-independent) so the output stays readable
const kinds = new Map()
for (const p of problems) {
  const kind = p.replace(/^[^:]*: /, "").replace(/"[^"]*"/g, '"…"').replace(/\d+/g, "N")
  kinds.set(kind, (kinds.get(kind) || 0) + 1)
}
console.log(`\n${problems.length} problem(s) across ${new Set(problems.map((p) => p.split(": ")[0])).size} route(s)`)
for (const [k, n] of [...kinds].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${k}`)
if (process.argv.includes("--verbose")) for (const p of problems) console.log("   ", p)
process.exit(problems.length ? 1 : 0)

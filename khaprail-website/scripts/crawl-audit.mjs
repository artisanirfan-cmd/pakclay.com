// Crawler's-eye audit: plain HTTP GETs with NO JavaScript execution and a
// Googlebot user agent — i.e. exactly what a search engine's first fetch
// sees. Reports, per URL: HTTP status / redirect target, <title> count and
// text, canonical URL + how many canonical tags, meta description, <h1>
// count, visible text length (proves real content is in the HTML, not an
// empty SPA shell), and any noindex signals (meta robots + X-Robots-Tag).
//
//   node scripts/crawl-audit.mjs https://pakclay.com
//   node scripts/crawl-audit.mjs http://localhost:3000 /about /products/x
//
// Not part of the build — a verification tool used for the technical-SEO
// batches (see 00-PROGRESS.md, batch 47).

const base = (process.argv[2] || "https://pakclay.com").replace(/\/+$/, "")
const custom = process.argv.slice(3)
const routes = custom.length
  ? custom
  : [
      "/", "/about", "/contact", "/products", "/products/", "/categories", "/categories/outdoor-tiles",
      "/products/multi-terra-tiles", "/blog", "/blog/what-is-a-clay-tile-a-complete-guide-to-khaprail-terracotta-tiles",
      "/new-arrivals", "/best-sellers", "/videos", "/downloads", "/search",
      "/nope-not-a-page", "/products/does-not-exist-xyz", "/categories/nope-xyz", "/blog/nope-xyz",
      "/admin", "/admin/login", "/index.html", "/products/index.html", "/robots.txt", "/sitemap.xml",
    ]

async function get(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await fetch(url, {
        redirect: "manual",
        headers: { "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" },
        signal: AbortSignal.timeout(25000),
      })
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }
  }
  return null
}

const first = (re, text) => (text.match(re) || [])[1]
console.log(`Crawler audit of ${base}\n`)

for (const route of routes) {
  const res = await get(base + route)
  if (!res) {
    console.log(`----  ${route.padEnd(60)} NO RESPONSE`)
    continue
  }
  const head = `${String(res.status).padEnd(4)}  ${route.padEnd(60)}`
  if (res.status >= 300 && res.status < 400) {
    console.log(head, "->", res.headers.get("location"))
    continue
  }
  const type = res.headers.get("content-type") || ""
  const body = await res.text()
  if (!/html/i.test(type)) {
    console.log(head, `[${type.split(";")[0]}] ${body.length} bytes`)
    continue
  }
  const titles = body.match(/<title>[^<]*<\/title>/g) || []
  const canonicals = body.match(/<link[^>]*rel="canonical"[^>]*>/g) || []
  const canonical = first(/href="([^"]*)"/, canonicals[0] || "")
  const description = first(/<meta[^>]*name="description"[^>]*content="([^"]*)"/, body)
  const h1 = (body.match(/<h1[\s>]/g) || []).length
  const metaRobots = first(/<meta[^>]*name="robots"[^>]*content="([^"]*)"/, body)
  const headerRobots = res.headers.get("x-robots-tag")
  const text = body
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim().length
  console.log(
    head,
    `title x${titles.length} "${(first(/<title>([^<]*)<\/title>/, body) || "").slice(0, 40)}"`,
    `| desc ${description ? "yes" : "NO"} | h1 x${h1} | text ${text} chars | canonical x${canonicals.length}`,
    metaRobots ? `| meta robots=${metaRobots}` : "",
    headerRobots ? `| X-Robots-Tag=${headerRobots}` : "",
  )
  if (canonical) console.log(`        canonical: ${canonical}`)
}

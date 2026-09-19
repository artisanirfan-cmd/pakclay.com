import type { Request as ExpressRequest, Response as ExpressResponse } from "express"
import { getSiteUrl } from "../lib/site.js"

// GET /robots.txt — generated so the Sitemap line always uses the real site
// origin (it was a static file that hardcoded the retired *.vercel.app host,
// telling crawlers to fetch a sitemap from a domain that now 404s).
// /admin is also sent `X-Robots-Tag: noindex` by the page handler, because a
// robots.txt Disallow only stops crawling — it does not stop indexing.
export function robotsHandler(_req: ExpressRequest, res: ExpressResponse): void {
  res
    .status(200)
    .type("text/plain; charset=utf-8")
    .set("Cache-Control", "public, max-age=3600")
    .send(`User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: ${getSiteUrl()}/sitemap.xml\n`)
}

// The site's public origin, used for canonical URLs, sitemap <loc>s and the
// robots.txt Sitemap line. Set SITE_URL (or VITE_SITE_URL, which the client
// build and the prerender script also read) to change it; the default is the
// live domain. A function, not a constant: index.ts loads `.env` at runtime
// AFTER its imports are evaluated, so a module-level constant would miss it.
export function getSiteUrl(): string {
  return (process.env.SITE_URL || process.env.VITE_SITE_URL || "https://pakclay.com").replace(/\/+$/, "")
}

import path from "node:path"
import { fileURLToPath } from "node:url"
import express from "express"
import { aiChatHandler } from "./routes/ai-chat.js"
import { generateSummaryHandler } from "./routes/generate-summary.js"
import { sitemapHandler } from "./routes/sitemap.js"

// Production server for khaprail-website, replacing the previous Vercel
// deployment: serves the built Vite app (dist/) as static files, implements
// the two AI routes as real Express endpoints (ported verbatim from the old
// Vercel Functions — see server/routes/ai-chat.ts), and falls back to
// index.html for any non-API route so React Router's client-side routing
// keeps working on a full page load/refresh at any URL.

try {
  process.loadEnvFile()
} catch {
  // No local .env file — fine on the VPS, where real env vars are set
  // directly in the environment (e.g. via the PM2 ecosystem file or the
  // shell) rather than a physical .env file.
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST_DIR = path.resolve(__dirname, "../dist")
const PORT = Number(process.env.PORT) || 3000

const app = express()

// Behind Hostinger's LiteSpeed-managed reverse proxy (hPanel Node.js App
// hosting) — needed so `req.protocol`/`req.ip` reflect the real client,
// not the proxy.
app.set("trust proxy", 1)

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`)
  next()
})

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" })
})

app.all("/sitemap.xml", sitemapHandler)

// `express.raw()` (not `express.json()`) buffers the body without parsing
// it — the ported handlers call `request.json()` themselves and return
// their own `invalid_json` error shape on a parse failure, which a JSON
// body-parsing middleware would otherwise short-circuit before the handler
// ever runs.
app.all("/api/ai-chat", express.raw({ type: "*/*", limit: "2mb" }), aiChatHandler)
app.all("/api/ai/generate-summary", express.raw({ type: "*/*", limit: "1mb" }), generateSummaryHandler)

// Cache policy (Lighthouse "efficient cache lifetimes"): Vite emits every JS/
// CSS/image under /assets/ with a content hash in the filename, so those are
// immutable for a year; the self-hosted fonts and icons have fixed filenames
// so they get 30 days; HTML (incl. the prerendered per-route pages) must
// always revalidate so a redeploy is visible immediately (ETag -> 304).
app.use(
  express.static(DIST_DIR, {
    setHeaders(res, filePath) {
      const normalized = filePath.split(path.sep).join("/")
      if (normalized.includes("/dist/assets/")) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable")
      } else if (/\.(?:otf|ttf|woff2?|png|jpe?g|webp|avif|svg|ico)$/i.test(normalized)) {
        res.setHeader("Cache-Control", "public, max-age=2592000")
      } else if (/\.html$/i.test(normalized)) {
        res.setHeader("Cache-Control", "no-cache")
      } else if (/\.(?:txt|xml)$/i.test(normalized)) {
        res.setHeader("Cache-Control", "public, max-age=3600")
      }
    },
  }),
)

// SPA fallback: any non-API route that isn't a real static file gets
// index.html, so React Router can handle it client-side.
app.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") return next()
  if (req.path.startsWith("/api/")) return next()
  res.sendFile(path.join(DIST_DIR, "index.html"))
})

app.listen(PORT, () => {
  console.log(`[server] khaprail-website listening on port ${PORT}`)
})

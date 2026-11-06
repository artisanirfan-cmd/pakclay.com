import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// SEO automation publisher. The daily scheduled task commits article files to
// content/blog/queue/ (<slug>.json + <slug>.md) and product description
// patches to content/products/<date>.json. This job turns them into rows:
//   - blog_posts + blog_faqs, idempotent by slug, only once `publish_at` is due
//   - products.description, only where it is still the import placeholder
// Source is the deployed repo files, or (when SEO_GITHUB_REPO is set) the
// GitHub repo itself, so content goes live without redeploying.
// PUBLISH_MODE=draft saves articles as drafts for review; default is published.

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOCAL_ROOT = path.resolve(__dirname, "../../content")
const PLACEHOLDER = "needs a full description"

interface QueueItem {
  slug: string
  title: string
  publish_at: string
  cover_product_slug?: string
  cover_image_url?: string | null
  category?: string
  author?: string
  read_time_minutes?: number
  excerpt?: string
  focus_keyword?: string
  meta_title?: string
  meta_description?: string
  answer_box?: string
  ai_summary?: string
  entity_tags?: string[]
  content_file: string
  faqs?: { question: string; answer: string; sort_order?: number }[]
}

interface ProductPatch {
  slug: string
  description: string
}

async function listFiles(dir: string): Promise<string[]> {
  const repo = process.env.SEO_GITHUB_REPO
  if (repo) {
    const branch = process.env.SEO_GITHUB_BRANCH || "main"
    const headers: Record<string, string> = { Accept: "application/vnd.github+json" }
    if (process.env.SEO_GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.SEO_GITHUB_TOKEN}`
    const res = await fetch(
      `https://api.github.com/repos/${repo}/contents/khaprail-website/content/${dir}?ref=${branch}`,
      { headers },
    )
    if (!res.ok) return []
    const rows = (await res.json()) as { name: string; type: string }[]
    return rows.filter((r) => r.type === "file").map((r) => r.name)
  }
  try {
    return await fs.readdir(path.join(LOCAL_ROOT, dir))
  } catch {
    return []
  }
}

async function readFile(dir: string, name: string): Promise<string | null> {
  const repo = process.env.SEO_GITHUB_REPO
  if (repo) {
    const branch = process.env.SEO_GITHUB_BRANCH || "main"
    const headers: Record<string, string> = {}
    if (process.env.SEO_GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.SEO_GITHUB_TOKEN}`
    const res = await fetch(
      `https://raw.githubusercontent.com/${repo}/${branch}/khaprail-website/content/${dir}/${name}`,
      { headers },
    )
    return res.ok ? res.text() : null
  }
  try {
    return await fs.readFile(path.join(LOCAL_ROOT, dir, name), "utf8")
  } catch {
    return null
  }
}

function adminClient(): SupabaseClient | null {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

async function publishArticles(db: SupabaseClient, now: Date) {
  const status = process.env.PUBLISH_MODE === "draft" ? "draft" : "published"
  const names = (await listFiles("blog/queue")).filter((n) => n.endsWith(".json"))
  let published = 0
  for (const name of names) {
    try {
      const raw = await readFile("blog/queue", name)
      if (!raw) continue
      const item = JSON.parse(raw) as QueueItem
      if (!item.slug || new Date(item.publish_at) > now) continue
      const { data: existing } = await db.from("blog_posts").select("id").eq("slug", item.slug).maybeSingle()
      if (existing) continue
      const content = await readFile("blog/queue", item.content_file)
      if (!content) continue

      let cover = item.cover_image_url ?? null
      if (!cover && item.cover_product_slug) {
        const { data: p } = await db
          .from("products").select("cover_image_url").eq("slug", item.cover_product_slug).maybeSingle()
        cover = p?.cover_image_url ?? null
      }

      const { data: post, error } = await db
        .from("blog_posts")
        .insert({
          title: item.title, slug: item.slug, cover_image_url: cover,
          category: item.category ?? null, author: item.author ?? "Pak Clay Team",
          read_time_minutes: item.read_time_minutes ?? null, excerpt: item.excerpt ?? null,
          content, focus_keyword: item.focus_keyword ?? null,
          meta_title: item.meta_title ?? null, meta_description: item.meta_description ?? null,
          answer_box: item.answer_box ?? null, ai_summary: item.ai_summary ?? null,
          entity_tags: item.entity_tags ?? [], status,
          published_at: status === "published" ? now.toISOString() : null,
        })
        .select("id").single()
      if (error || !post) {
        console.error("[blog-publisher] insert failed", item.slug, error?.message)
        continue
      }
      const faqs = (item.faqs ?? []).map((f, i) => ({
        post_id: post.id, question: f.question, answer: f.answer, sort_order: f.sort_order ?? i + 1,
      }))
      if (faqs.length) {
        const { error: fe } = await db.from("blog_faqs").insert(faqs)
        if (fe) console.error("[blog-publisher] faq insert failed", item.slug, fe.message)
      }
      published++
      console.log(`[blog-publisher] ${status}: ${item.slug}`)
    } catch (e) {
      console.error("[blog-publisher] error on", name, e)
    }
  }
  return published
}

async function applyProductPatches(db: SupabaseClient, now: Date) {
  const names = (await listFiles("products")).filter((n) => /^\d{4}-\d{2}-\d{2}\.json$/.test(n))
  let updated = 0
  for (const name of names) {
    if (new Date(name.slice(0, 10) + "T00:00:00+05:00") > now) continue
    const raw = await readFile("products", name)
    if (!raw) continue
    let patches: ProductPatch[]
    try { patches = JSON.parse(raw) } catch { continue }
    for (const p of patches) {
      const { data } = await db.from("products").select("id, description").eq("slug", p.slug).maybeSingle()
      if (!data) continue
      if (data.description && !data.description.toLowerCase().includes(PLACEHOLDER)) continue
      const { error } = await db.from("products").update({ description: p.description }).eq("id", data.id)
      if (!error) { updated++; console.log(`[blog-publisher] product description: ${p.slug}`) }
    }
  }
  return updated
}

export async function runSeoPublisher(): Promise<{ articles: number; products: number }> {
  const db = adminClient()
  if (!db) return { articles: 0, products: 0 }
  const now = process.env.SEO_NOW ? new Date(process.env.SEO_NOW) : new Date()
  return { articles: await publishArticles(db, now), products: await applyProductPatches(db, now) }
}

export function startSeoPublisher() {
  if (process.env.SEO_PUBLISHER === "off") return
  const tick = () => runSeoPublisher().catch((e) => console.error("[blog-publisher]", e))
  setTimeout(tick, 30_000)
  setInterval(tick, 60 * 60 * 1000)
}

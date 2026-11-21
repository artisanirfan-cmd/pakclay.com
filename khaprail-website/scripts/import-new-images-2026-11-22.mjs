// One-off import: 2026-11-22 new product photos (17 products). Plan: new-images-2026-11-22.plan.json,
// photos: new-images-2026-11-22/ (made by prepare-new-images-2026-11-22.py). No logos found -> no crops.
//   node scripts/import-new-images-2026-11-22.mjs            # dry run
//   node scripts/import-new-images-2026-11-22.mjs --apply    # writes
//   node scripts/import-new-images-2026-11-22.mjs --rollback
// Idempotent: skips any product whose slug already exists. Needs SUPABASE_SERVICE_ROLE_KEY + VITE_SUPABASE_URL in .env.
import { createClient } from "@supabase/supabase-js"
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
try { process.loadEnvFile() } catch {}
const HERE = path.dirname(fileURLToPath(import.meta.url))
const PLAN = JSON.parse(readFileSync(path.join(HERE, "new-images-2026-11-22.plan.json"), "utf8"))
const IMG = path.join(HERE, "new-images-2026-11-22")
const OUT = path.join(HERE, "output", "new-images-2026-11-22-applied.json")
const ALT = path.join(HERE, "output", "new-images-2026-11-22-alt-text.json")
const APPLY = process.argv.includes("--apply"), ROLLBACK = process.argv.includes("--rollback")
const NOTE = "Imported from real product photography - needs a full description from Khaprail."
const url = process.env.VITE_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env - aborting."); process.exit(1) }
const sb = createClient(url, key, { auth: { persistSession: false } })
const slugify = (t) => t.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")

async function upload(p, buf) {
  const { error } = await sb.storage.from("product-images").upload(p, buf, { contentType: "image/jpeg", cacheControl: "31536000", upsert: true })
  if (error) throw new Error(`Upload failed ${p}: ${error.message}`)
  return sb.storage.from("product-images").getPublicUrl(p).data.publicUrl
}

if (ROLLBACK) {
  if (!existsSync(OUT)) { console.log("Nothing to roll back."); process.exit(0) }
  const a = JSON.parse(readFileSync(OUT, "utf8"))
  for (const id of a.createdProducts) { await sb.from("product_images").delete().eq("product_id", id); await sb.from("products").delete().eq("id", id) }
  console.log("Rolled back (Storage objects left in place)."); process.exit(0)
}
console.log(`Mode: ${APPLY ? "APPLY" : "DRY RUN"}`)
const { data: cats, error: ce } = await sb.from("categories").select("id, slug"); if (ce) throw ce
const { data: prods, error: pe } = await sb.from("products").select("slug"); if (pe) throw pe
const catBy = new Map(cats.map((c) => [c.slug, c])), have = new Set(prods.map((p) => p.slug))
const applied = { createdProducts: [] }, alt = existsSync(ALT) ? JSON.parse(readFileSync(ALT, "utf8")) : {}
for (const it of PLAN.products) {
  const slug = slugify(it.name)
  if (have.has(slug)) { console.log(`skip (exists) ${slug}`); continue }
  const cat = catBy.get(it.category); if (!cat) throw new Error(`Category ${it.category} not found`)
  console.log(`${APPLY ? "create" : "would create"} ${slug} -> ${it.category} (${it.images.length} photo)`)
  if (!APPLY) continue
  const urls = []
  for (const [i, k] of it.images.entries()) {
    const u = await upload(`products/${slug}/${slug}-${i + 1}.jpg`, readFileSync(path.join(IMG, `${k}.jpg`)))
    urls.push(u); alt[u] = `Pak Clay Industry ${it.name} Lahore Pakistan`
  }
  const [cover, ...gallery] = urls
  const { data: row, error } = await sb.from("products").insert({ name: it.name, slug, description: NOTE, size: it.size, country_of_origin: "Pakistan", cover_image_url: cover, category_id: cat.id, brand: "Khaprail Tiles", manufacturer: "Khaprail Tiles", is_new: false }).select("id").single()
  if (error) throw error
  if (gallery.length) {
    const { error: ie } = await sb.from("product_images").insert(gallery.map((image_url, i) => ({ product_id: row.id, image_url, sort_order: i })))
    if (ie) { await sb.from("products").delete().eq("id", row.id); throw ie }
  }
  applied.createdProducts.push(row.id)
}
if (APPLY) {
  mkdirSync(path.dirname(OUT), { recursive: true })
  const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : { createdProducts: [] }
  prev.createdProducts.push(...applied.createdProducts)
  writeFileSync(OUT, JSON.stringify(prev, null, 2)); writeFileSync(ALT, JSON.stringify(alt, null, 2))
  console.log("Done.")
} else console.log("Dry run only.")

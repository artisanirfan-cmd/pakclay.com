// One-off import: real product photography for "wall tiles" supplied by
// Sylvester, sitting outside khaprail-website/ at
// "<repo root>/project khaprail tiles/wall tiles/" (22 real .jpg photos
// across 10 leaf folders — see 00-PROGRESS.md batch 42 for the full
// category-mapping decisions this script encodes).
//
// Every image upload path in this app is required to use the permanent
// getPublicUrl() pattern, never a signed/expiring URL (see 00-PROGRESS.md
// batch 41 — images were previously disappearing ~1-2hrs after upload
// because of exactly that mistake). This script follows that same pattern.
//
// Needs SUPABASE_SERVICE_ROLE_KEY in khaprail-website/.env (NOT the
// publishable/anon key) — the `product-images` bucket's write policy is
// scoped to the `authenticated` role, and there's no interactive admin
// login available from a one-off script, so this uses the service role
// key to bypass RLS for this import only. Nothing about the deployed
// app's own credentials changes.
//
// Idempotent: re-running skips any product whose slug already exists
// (reported, not duplicated) and re-uploads (upsert) any image so a
// crash mid-run can just be re-run safely.

import { createClient } from "@supabase/supabase-js"
import { readdirSync, readFileSync, existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

try {
  process.loadEnvFile()
} catch {
  // No local .env — fine if the vars are already in process.env.
}

const WEBSITE_ROOT = path.resolve(fileURLToPath(import.meta.url), "../..")
const IMPORT_ROOT = path.resolve(WEBSITE_ROOT, "..", "project khaprail tiles", "wall tiles")
const BUCKET = "product-images"
const IMPORT_NOTE = "Imported from real product photography — needs a full description from Khaprail."

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error("[import] Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in khaprail-website/.env — aborting.")
  process.exit(1)
}
if (!existsSync(IMPORT_ROOT)) {
  console.error(`[import] Import folder not found: ${IMPORT_ROOT}`)
  process.exit(1)
}

const supabase = createClient(url, serviceKey)

// Mirrors src/lib/utils.ts's slugify() — duplicated rather than imported
// since this plain Node script isn't run through Vite/TS.
function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

// ---------------------------------------------------------------------------
// Category plan (see 00-PROGRESS.md batch 42 for why each of these three
// judgment calls was made this way, confirmed with Sylvester beforehand):
//
// - Kitchen already has a real "Terracotta Kitchen Wall Tiles" 3rd-level
//   category that exactly matches the kitchen photo folder — reused, not
//   recreated.
// - Bathroom/Outdoor Wall Tiles exist as 2nd-level categories but had no
//   material-level child yet — new "Terracotta {Bathroom,Outdoor} Wall
//   Tiles" 3rd-level categories created to match Kitchen's existing pattern.
// - No "Living Room Wall Tiles" category existed at all — created as a new
//   2nd-level category plus Granite/Marble/Stone/Terracotta 3rd-level
//   material children, matching Kitchen's 3-tier shape.
// - The "Marble Living Room Wall Tiles" folder has photos directly inside
//   it (no separate product-name subfolder like the other materials) — the
//   category and its one product share the same name rather than inventing
//   a distinguishing name that isn't in the source data.
// ---------------------------------------------------------------------------

const ROOT_SLUGS_NEEDED = ["wall-tiles", "bathroom-wall-tiles", "outdoor-wall-tiles", "kitchen-wall-tiles-terracotta"]

const CATEGORIES_TO_ENSURE = [
  { slug: "living-room-wall-tiles", name: "Living Room Wall Tiles", parentSlug: "wall-tiles", sortOrder: 7 },
  { slug: "living-room-wall-tiles-granite", name: "Granite Living Room Wall Tiles", parentSlug: "living-room-wall-tiles", sortOrder: 1 },
  { slug: "living-room-wall-tiles-marble", name: "Marble Living Room Wall Tiles", parentSlug: "living-room-wall-tiles", sortOrder: 2 },
  { slug: "living-room-wall-tiles-stone", name: "Stone Living Room Wall Tiles", parentSlug: "living-room-wall-tiles", sortOrder: 3 },
  { slug: "living-room-wall-tiles-terracotta", name: "Terracotta Living Room Wall Tiles", parentSlug: "living-room-wall-tiles", sortOrder: 4 },
  { slug: "bathroom-wall-tiles-terracotta", name: "Terracotta Bathroom Wall Tiles", parentSlug: "bathroom-wall-tiles", sortOrder: 1 },
  { slug: "outdoor-wall-tiles-terracotta", name: "Terracotta Outdoor Wall Tiles", parentSlug: "outdoor-wall-tiles", sortOrder: 1 },
]

// `folder` is relative to IMPORT_ROOT. `size` mirrors the one real existing
// example in the DB ("12 X 12" — no unit suffix), or null when the folder
// name didn't encode a parseable size.
const PRODUCTS_TO_IMPORT = [
  { folder: "Living Room Wall Tiles/Granite Living Room Wall Tiles/Multi Colors Granite Tiles", name: "Multi Colors Granite Tiles", categorySlug: "living-room-wall-tiles-granite", size: null },
  { folder: "Living Room Wall Tiles/Marble Living Room Wall Tiles", name: "Marble Living Room Wall Tiles", categorySlug: "living-room-wall-tiles-marble", size: null },
  { folder: "Living Room Wall Tiles/Stone Living Room Wall Tiles/6x12 Stone Tiles", name: "6x12 Stone Tiles", categorySlug: "living-room-wall-tiles-stone", size: "6 X 12" },
  { folder: "Living Room Wall Tiles/Stone Living Room Wall Tiles/Grey Stone Wall Tiles", name: "Grey Stone Wall Tiles", categorySlug: "living-room-wall-tiles-stone", size: null },
  { folder: "Living Room Wall Tiles/Stone Living Room Wall Tiles/Withe Stone Wall Tiles", name: "White Stone Wall Tiles", categorySlug: "living-room-wall-tiles-stone", size: null },
  { folder: "Living Room Wall Tiles/Stone Living Room Wall Tiles/Yellow Stone Wall Tiles", name: "Yellow Stone Wall Tiles", categorySlug: "living-room-wall-tiles-stone", size: null },
  { folder: "Living Room Wall Tiles/Terracotta Living Room Wall Tiles/9x3 inch terracotta tiles", name: "9x3 Inch Terracotta Tiles", categorySlug: "living-room-wall-tiles-terracotta", size: "9 X 3" },
  { folder: "bathroom wall tiles/terracotta bathroom wall tiles/12x12 inch terracotta tiles", name: "12x12 Inch Terracotta Tiles", categorySlug: "bathroom-wall-tiles-terracotta", size: "12 X 12" },
  { folder: "kitchen wall tiles/terracotta kitchen wall tiles/square 6x6 inch tiles", name: "Square 6x6 Inch Tiles", categorySlug: "kitchen-wall-tiles-terracotta", size: "6 X 6" },
  { folder: "outdoor wall tiles/terracotta outdoor wall tiles/multi terra tiles", name: "Multi Terra Tiles", categorySlug: "outdoor-wall-tiles-terracotta", size: null },
]

async function loadRootSlugs(slugToId) {
  const { data, error } = await supabase.from("categories").select("id, slug").in("slug", ROOT_SLUGS_NEEDED)
  if (error) throw error
  for (const row of data) slugToId.set(row.slug, row.id)
  for (const s of ROOT_SLUGS_NEEDED) {
    if (!slugToId.has(s)) throw new Error(`Expected existing category slug "${s}" not found — aborting rather than guessing.`)
  }
}

async function ensureCategory(cat, slugToId) {
  const { data: existing, error: selErr } = await supabase.from("categories").select("id").eq("slug", cat.slug).maybeSingle()
  if (selErr) throw selErr
  if (existing) {
    slugToId.set(cat.slug, existing.id)
    console.log(`[category] already exists, reused: ${cat.name}`)
    return
  }
  const parentId = slugToId.get(cat.parentSlug)
  if (!parentId) throw new Error(`Parent "${cat.parentSlug}" not resolved before creating "${cat.slug}"`)
  const { data, error } = await supabase
    .from("categories")
    .insert({ name: cat.name, slug: cat.slug, parent_id: parentId, sort_order: cat.sortOrder })
    .select("id")
    .single()
  if (error) throw error
  slugToId.set(cat.slug, data.id)
  console.log(`[category] created: ${cat.name} (${data.id})`)
}

function listJpgFiles(absDir) {
  return readdirSync(absDir, { withFileTypes: true })
    .filter((e) => e.isFile() && /\.jpe?g$/i.test(e.name))
    .map((e) => e.name)
    .sort()
}

async function uploadAndCreateProduct(plan, categoryId) {
  const slug = slugify(plan.name)

  const { data: existingProduct, error: selErr } = await supabase.from("products").select("id").eq("slug", slug).maybeSingle()
  if (selErr) throw selErr
  if (existingProduct) {
    console.log(`[product] SKIP — already exists: ${plan.name} (${slug})`)
    return { skipped: true, name: plan.name, slug }
  }

  const absDir = path.join(IMPORT_ROOT, plan.folder)
  if (!existsSync(absDir)) throw new Error(`Folder not found: ${absDir}`)
  const files = listJpgFiles(absDir)
  if (files.length === 0) throw new Error(`No .jpg files in ${absDir}`)

  const uploadedUrls = []
  for (const filename of files) {
    const fileBuffer = readFileSync(path.join(absDir, filename))
    const objectPath = `products/${slug}/${filename}`
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(objectPath, fileBuffer, {
      contentType: "image/jpeg",
      cacheControl: "3600",
      upsert: true,
    })
    if (uploadError) throw new Error(`Upload failed for ${filename}: ${uploadError.message}`)
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(objectPath)
    uploadedUrls.push(pub.publicUrl)
  }

  const [coverUrl, ...galleryUrls] = uploadedUrls

  const { data: productRow, error: productError } = await supabase
    .from("products")
    .insert({
      name: plan.name,
      slug,
      description: IMPORT_NOTE,
      size: plan.size,
      country_of_origin: "Pakistan",
      cover_image_url: coverUrl,
      category_id: categoryId,
      brand: "Khaprail Tiles",
      manufacturer: "Khaprail Tiles",
      is_new: false,
    })
    .select("id")
    .single()
  if (productError) throw productError

  if (galleryUrls.length > 0) {
    const rows = galleryUrls.map((image_url, i) => ({ product_id: productRow.id, image_url, sort_order: i }))
    const { error: imgError } = await supabase.from("product_images").insert(rows)
    if (imgError) throw imgError
  }

  console.log(`[product] created: ${plan.name} — ${uploadedUrls.length} image(s), cover: ${files[0]}`)
  return { skipped: false, name: plan.name, slug, imageCount: uploadedUrls.length }
}

async function main() {
  console.log(`[import] Source: ${IMPORT_ROOT}`)
  const slugToId = new Map()
  await loadRootSlugs(slugToId)

  for (const cat of CATEGORIES_TO_ENSURE) {
    await ensureCategory(cat, slugToId)
  }

  const results = []
  for (const plan of PRODUCTS_TO_IMPORT) {
    const categoryId = slugToId.get(plan.categorySlug)
    if (!categoryId) throw new Error(`Category "${plan.categorySlug}" not resolved for product "${plan.name}"`)
    results.push(await uploadAndCreateProduct(plan, categoryId))
  }

  const created = results.filter((r) => !r.skipped)
  const skipped = results.filter((r) => r.skipped)
  const totalImages = created.reduce((sum, r) => sum + r.imageCount, 0)

  console.log("\n=== SUMMARY ===")
  console.log(`Products created: ${created.length} (${totalImages} images uploaded)`)
  created.forEach((r) => console.log(`  - ${r.name} (${r.imageCount} images)`))
  console.log(`Products skipped (slug already existed): ${skipped.length}`)
  skipped.forEach((r) => console.log(`  - ${r.name}`))
}

main().catch((err) => {
  console.error("[import] FAILED:", err)
  process.exit(1)
})

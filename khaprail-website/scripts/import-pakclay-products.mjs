// One-off import: real product photography supplied by Sylvester at
// "<repo root>/project Pakclay products/" (39 photos total). See
// 00-PROGRESS.md for the cross-check this script's plan is based on:
//
// - The "wall tiles/" branch of this folder is BYTE-IDENTICAL (md5) to the
//   already-imported "project khaprail tiles/wall tiles/" folder from batch
//   42, with exactly one genuinely new file: "outdoor wall tiles/terracotta
//   outdoor wall tiles/List Tile/*.jpg". Every other wall-tiles product this
//   script would otherwise create already exists (10 products, batch 42) —
//   this script only imports the one new "List Tile" product plus the 5 new
//   "Khaprail Tiles" variant folders. It does NOT touch or re-import
//   anything batch 42 already created.
// - "Khaprail Tiles/*" (5 folders, 12 photos) are new, more specific
//   variants distinct from the 7 original generic Khaprail products
//   (barrel-tile, disco-tile, flat-tile, french-tile, italian-taylor-tile,
//   murlee-tile, spanish-tile — confirmed via live DB query: each already
//   has its own single stock cover photo under a different, older upload
//   convention, `<slug>.jpg.jpg`). No slug collisions with the new folders.
// - "Featured Categories/*" (4 photos) are candidate category cover
//   photos. Confirmed live: Khaprail Tiles, Mosaic Tiles and Roof Tiles
//   already have a `cover_image_url` (older `category-images/<slug>.jpg.jpg`
//   seed, unrelated to this folder) — left untouched rather than silently
//   overwritten. Only Pool Tiles has none, so only that one is set here.
//
// Same permanent-URL rule as every other image path in this app: always
// `getPublicUrl()`, never a signed/expiring URL (00-PROGRESS.md batch 41).
//
// Needs SUPABASE_SERVICE_ROLE_KEY in khaprail-website/.env (bypasses RLS
// for this one-off import only — see batch 42's script for why).
//
// Idempotent: re-running skips any product/category-cover that already
// exists (reported, not duplicated) and re-uploads (upsert) any image so a
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
const IMPORT_ROOT = path.resolve(WEBSITE_ROOT, "..", "project Pakclay products")
const PRODUCT_BUCKET = "product-images"
const CATEGORY_BUCKET = "category-images"
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

// Mirrors src/lib/utils.ts's slugify().
function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function listImageFiles(absDir) {
  return readdirSync(absDir, { withFileTypes: true })
    .filter((e) => e.isFile() && /\.jpe?g$/i.test(e.name))
    .map((e) => e.name)
    .sort()
}

// ---------------------------------------------------------------------------
// Part A: new Khaprail Tiles product variants (flat category, no subcategory
// per 12-CATEGORY-TAXONOMY.md) + the one new Wall Tiles product.
// `name` strips the folder's trailing sequence number (e.g. "... 001").
// `size` is left null everywhere — none of these folder/file names encode a
// parseable size, and the project's real-data-only rule forbids guessing one.
// ---------------------------------------------------------------------------

const PRODUCTS_TO_IMPORT = [
  {
    folder: "Khaprail Tiles/Flat Half Circle Khaprail Tiles 001",
    name: "Flat Half Circle Khaprail Tiles",
    categorySlug: "khaprail-tiles",
  },
  {
    folder: "Khaprail Tiles/Flat Rectangular Khaprail Tiles 001",
    name: "Flat Rectangular Khaprail Tiles",
    categorySlug: "khaprail-tiles",
  },
  {
    folder: "Khaprail Tiles/French Green Glazed Khaprail Tiles 001",
    name: "French Green Glazed Khaprail Tiles",
    categorySlug: "khaprail-tiles",
  },
  {
    folder: "Khaprail Tiles/French Natural Red Khaprail Tiles 001",
    name: "French Natural Red Khaprail Tiles",
    categorySlug: "khaprail-tiles",
  },
  {
    folder: "Khaprail Tiles/Spanish Natural Red Khaprail Tiles 001",
    name: "Spanish Natural Red Khaprail Tiles",
    categorySlug: "khaprail-tiles",
  },
  {
    folder: "wall tiles/outdoor wall tiles/terracotta outdoor wall tiles/List Tile",
    name: "List Tile",
    categorySlug: "outdoor-wall-tiles-terracotta",
  },
]

// ---------------------------------------------------------------------------
// Part B: category cover photos from "Featured Categories/". Only applied
// where the category doesn't already have one (see header note).
// ---------------------------------------------------------------------------

const CATEGORY_COVERS_TO_SET = [
  { folder: "Featured Categories/Khaprail Tiles", categorySlug: "khaprail-tiles" },
  { folder: "Featured Categories/Mosaic Tiles", categorySlug: "mosaic-tiles" },
  { folder: "Featured Categories/Pool Tiles", categorySlug: "pool-tiles" },
  { folder: "Featured Categories/Roof Tiles", categorySlug: "roof-tiles" },
]

async function getCategoryBySlug(slug) {
  const { data, error } = await supabase.from("categories").select("id, name, cover_image_url").eq("slug", slug).maybeSingle()
  if (error) throw error
  if (!data) throw new Error(`Category slug "${slug}" not found — aborting rather than guessing.`)
  return data
}

async function uploadAndCreateProduct(plan) {
  const slug = slugify(plan.name)

  const { data: existingProduct, error: selErr } = await supabase.from("products").select("id").eq("slug", slug).maybeSingle()
  if (selErr) throw selErr
  if (existingProduct) {
    console.log(`[product] SKIP — already exists: ${plan.name} (${slug})`)
    return { skipped: true, name: plan.name, slug }
  }

  const category = await getCategoryBySlug(plan.categorySlug)

  const absDir = path.join(IMPORT_ROOT, plan.folder)
  if (!existsSync(absDir)) throw new Error(`Folder not found: ${absDir}`)
  const files = listImageFiles(absDir)
  if (files.length === 0) throw new Error(`No image files in ${absDir}`)

  const uploadedUrls = []
  for (const filename of files) {
    const fileBuffer = readFileSync(path.join(absDir, filename))
    const objectPath = `products/${slug}/${filename}`
    const { error: uploadError } = await supabase.storage.from(PRODUCT_BUCKET).upload(objectPath, fileBuffer, {
      contentType: "image/jpeg",
      cacheControl: "3600",
      upsert: true,
    })
    if (uploadError) throw new Error(`Upload failed for ${filename}: ${uploadError.message}`)
    const { data: pub } = supabase.storage.from(PRODUCT_BUCKET).getPublicUrl(objectPath)
    uploadedUrls.push(pub.publicUrl)
  }

  const [coverUrl, ...galleryUrls] = uploadedUrls

  const { data: productRow, error: productError } = await supabase
    .from("products")
    .insert({
      name: plan.name,
      slug,
      description: IMPORT_NOTE,
      size: null,
      country_of_origin: "Pakistan",
      cover_image_url: coverUrl,
      category_id: category.id,
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

async function setCategoryCover(plan) {
  const category = await getCategoryBySlug(plan.categorySlug)
  if (category.cover_image_url) {
    console.log(`[category-cover] SKIP — already has a cover: ${category.name}`)
    return { skipped: true, name: category.name }
  }

  const absDir = path.join(IMPORT_ROOT, plan.folder)
  if (!existsSync(absDir)) throw new Error(`Folder not found: ${absDir}`)
  const files = listImageFiles(absDir)
  if (files.length === 0) throw new Error(`No image files in ${absDir}`)
  const filename = files[0]

  const fileBuffer = readFileSync(path.join(absDir, filename))
  const objectPath = `${plan.categorySlug}-featured.jpg`
  const { error: uploadError } = await supabase.storage.from(CATEGORY_BUCKET).upload(objectPath, fileBuffer, {
    contentType: "image/jpeg",
    cacheControl: "3600",
    upsert: true,
  })
  if (uploadError) throw new Error(`Upload failed for ${filename}: ${uploadError.message}`)
  const { data: pub } = supabase.storage.from(CATEGORY_BUCKET).getPublicUrl(objectPath)

  const { error: updateError } = await supabase.from("categories").update({ cover_image_url: pub.publicUrl }).eq("id", category.id)
  if (updateError) throw updateError

  console.log(`[category-cover] set: ${category.name} <- ${filename}`)
  return { skipped: false, name: category.name }
}

async function main() {
  console.log(`[import] Source: ${IMPORT_ROOT}`)

  const productResults = []
  for (const plan of PRODUCTS_TO_IMPORT) {
    productResults.push(await uploadAndCreateProduct(plan))
  }

  const coverResults = []
  for (const plan of CATEGORY_COVERS_TO_SET) {
    coverResults.push(await setCategoryCover(plan))
  }

  const created = productResults.filter((r) => !r.skipped)
  const skippedProducts = productResults.filter((r) => r.skipped)
  const totalImages = created.reduce((sum, r) => sum + r.imageCount, 0)
  const setCovers = coverResults.filter((r) => !r.skipped)
  const skippedCovers = coverResults.filter((r) => r.skipped)

  console.log("\n=== SUMMARY ===")
  console.log(`Products created: ${created.length} (${totalImages} images uploaded)`)
  created.forEach((r) => console.log(`  - ${r.name} (${r.imageCount} images)`))
  console.log(`Products skipped (slug already existed): ${skippedProducts.length}`)
  skippedProducts.forEach((r) => console.log(`  - ${r.name}`))
  console.log(`Category covers set: ${setCovers.length}`)
  setCovers.forEach((r) => console.log(`  - ${r.name}`))
  console.log(`Category covers skipped (already had one): ${skippedCovers.length}`)
  skippedCovers.forEach((r) => console.log(`  - ${r.name}`))
}

main().catch((err) => {
  console.error("[import] FAILED:", err)
  process.exit(1)
})

// One-off import: the 2026-11-05 Google Drive images (9 folders, 16 distinct photos).
// Plan: scripts/drive-images-2026-11.plan.json. Photos: scripts/drive-images-2026-11/ (made by
// prepare-drive-images-2026-11.py). Analysis + logo findings: 00-PROGRESS.md (batch 55).
//
//   node scripts/import-drive-images-2026-11.mjs            # dry run, read-only
//   node scripts/import-drive-images-2026-11.mjs --apply    # writes
//   node scripts/import-drive-images-2026-11.mjs --rollback # undo category moves + delete what this run created
//
// What it does (idempotent - re-running changes nothing that already matches):
//  1. Creates category "Mosaic Kitchen Wall Tiles" under Kitchen Wall Tiles (same parent as
//     kitchen-wall-tiles-terracotta). Never duplicates a same-name sibling.
//  2. Creates 9 products (skips any slug that already exists) with real photos.
//  3. Adds the extra Square 6x6 photo to the live product.
//  4. Moves 4 live products to the category their Drive folder implies (old category ids are
//     saved to scripts/output/drive-images-2026-11-applied.json for --rollback).
//  5. Sets Clay Tiles / Industrial Tiles category covers ONLY if they have none.
// Needs SUPABASE_SERVICE_ROLE_KEY + VITE_SUPABASE_URL in khaprail-website/.env.

import { createClient } from "@supabase/supabase-js"
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

try {
  process.loadEnvFile()
} catch {
  // no local .env - fine if the vars are already set
}

const HERE = path.dirname(fileURLToPath(import.meta.url))
const PLAN = JSON.parse(readFileSync(path.join(HERE, "drive-images-2026-11.plan.json"), "utf8"))
const IMG_DIR = path.join(HERE, "drive-images-2026-11")
const OUT_FILE = path.join(HERE, "output", "drive-images-2026-11-applied.json")
const ALT_FILE = path.join(HERE, "output", "drive-images-2026-11-alt-text.json")
const APPLY = process.argv.includes("--apply")
const ROLLBACK = process.argv.includes("--rollback")
const IMPORT_NOTE = "Imported from real product photography - needs a full description from Khaprail."

const url = process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("[drive-import] Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in khaprail-website/.env - aborting.")
  process.exit(1)
}
const supabase = createClient(url, key, { auth: { persistSession: false } })

// Mirrors src/lib/utils.ts's slugify().
const slugify = (t) => t.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
const imageFile = (k) => {
  const p = path.join(IMG_DIR, `${k}.jpg`)
  if (!existsSync(p)) throw new Error(`Missing prepared image ${p} - run prepare-drive-images-2026-11.py first.`)
  return readFileSync(p)
}
const altOf = (k) => PLAN.images[k].alt

async function upload(bucket, objectPath, buffer) {
  const { error } = await supabase.storage.from(bucket).upload(objectPath, buffer, {
    contentType: "image/jpeg",
    cacheControl: "31536000",
    upsert: true,
  })
  if (error) throw new Error(`Upload failed (${objectPath}): ${error.message}`)
  return supabase.storage.from(bucket).getPublicUrl(objectPath).data.publicUrl
}

async function main() {
  console.log(`[drive-import] Mode: ${ROLLBACK ? "ROLLBACK" : APPLY ? "APPLY (writes)" : "DRY RUN (read-only)"}`)

  if (ROLLBACK) return rollback()

  const { data: cats, error: ce } = await supabase.from("categories").select("id, name, slug, parent_id, sort_order, cover_image_url")
  if (ce) throw ce
  const { data: prods, error: pe } = await supabase.from("products").select("id, slug, name, category_id")
  if (pe) throw pe
  const catBySlug = new Map(cats.map((c) => [c.slug, c]))
  const prodBySlug = new Map(prods.map((p) => [p.slug, p]))
  const applied = { createdCategories: [], createdProducts: [], movedProducts: [], addedImages: [], setCovers: [] }
  const alt = existsSync(ALT_FILE) ? JSON.parse(readFileSync(ALT_FILE, "utf8")) : {}

  // 1. Categories
  console.log("\n=== CATEGORIES ===")
  for (const plan of PLAN.categories) {
    const existing = catBySlug.get(plan.slug)
    if (existing) {
      console.log(`  reuse   ${plan.slug}`)
      continue
    }
    const model = catBySlug.get(plan.parentOf)
    if (!model?.parent_id) throw new Error(`Cannot find parent via "${plan.parentOf}" - aborting rather than guessing.`)
    const sameName = cats.find((c) => c.parent_id === model.parent_id && c.name.toLowerCase() === plan.name.toLowerCase())
    if (sameName) {
      catBySlug.set(plan.slug, sameName)
      console.log(`  reuse   ${plan.slug} (same name: ${sameName.slug})`)
      continue
    }
    const siblings = cats.filter((c) => c.parent_id === model.parent_id)
    const sort = siblings.reduce((m, c) => Math.max(m, c.sort_order ?? 0), 0) + 1
    console.log(`  ${APPLY ? "create " : "would create"} ${plan.slug} (${plan.name}) sort ${sort}`)
    if (APPLY) {
      const { data, error } = await supabase
        .from("categories")
        .insert({ name: plan.name, slug: plan.slug, parent_id: model.parent_id, sort_order: sort, cover_image_url: null })
        .select("id, name, slug, parent_id, sort_order, cover_image_url")
        .single()
      if (error) throw error
      catBySlug.set(plan.slug, data)
      applied.createdCategories.push(data.id)
    } else {
      catBySlug.set(plan.slug, { id: `(new:${plan.slug})`, name: plan.name, slug: plan.slug, parent_id: model.parent_id })
    }
  }
  const findCategory = (slug) => {
    const c = catBySlug.get(slug)
    if (c) return c
    const byName = cats.find((x) => !x.parent_id && slugify(x.name) === slug)
    if (byName) return byName
    throw new Error(`Category "${slug}" not found - aborting.`)
  }

  // 2. Products
  console.log("\n=== NEW PRODUCTS ===")
  for (const item of PLAN.products) {
    const slug = slugify(item.name)
    if (prodBySlug.has(slug)) {
      console.log(`  skip (exists) ${slug}`)
      continue
    }
    const category = findCategory(item.category)
    console.log(`  ${APPLY ? "create" : "would create"} ${slug}  ->  ${category.slug}  (${item.images.length} photo${item.images.length > 1 ? "s" : ""})`)
    if (!APPLY) continue
    const urls = []
    for (const [i, k] of item.images.entries()) {
      const u = await upload("product-images", `products/${slug}/${slug}-${i + 1}.jpg`, imageFile(k))
      urls.push(u)
      alt[u] = altOf(k)
    }
    const [cover, ...gallery] = urls
    const { data: row, error } = await supabase
      .from("products")
      .insert({
        name: item.name,
        slug,
        description: IMPORT_NOTE,
        size: item.size,
        country_of_origin: "Pakistan",
        cover_image_url: cover,
        category_id: category.id,
        brand: "Khaprail Tiles",
        manufacturer: "Khaprail Tiles",
        is_new: false,
      })
      .select("id")
      .single()
    if (error) throw error
    if (gallery.length) {
      const { error: ie } = await supabase
        .from("product_images")
        .insert(gallery.map((image_url, i) => ({ product_id: row.id, image_url, sort_order: i })))
      if (ie) {
        await supabase.from("products").delete().eq("id", row.id)
        throw ie
      }
    }
    applied.createdProducts.push(row.id)
  }

  // 3. Extra photos for live products
  console.log("\n=== EXTRA PHOTOS ===")
  for (const extra of PLAN.extraImages) {
    const product = prodBySlug.get(extra.productSlug)
    if (!product) {
      console.log(`  skip (product not found) ${extra.productSlug}`)
      continue
    }
    const { data: existingImgs, error } = await supabase.from("product_images").select("image_url, sort_order").eq("product_id", product.id)
    if (error) throw error
    let next = existingImgs.reduce((m, r) => Math.max(m, r.sort_order ?? 0), -1) + 1
    for (const k of extra.images) {
      const objectPath = `products/${extra.productSlug}/${extra.productSlug}-drive-${k}.jpg`
      const publicUrl = supabase.storage.from("product-images").getPublicUrl(objectPath).data.publicUrl
      if (existingImgs.some((r) => r.image_url === publicUrl)) {
        console.log(`  skip (already added) ${extra.productSlug} <- ${k}`)
        continue
      }
      console.log(`  ${APPLY ? "add" : "would add"} ${k} -> ${extra.productSlug}`)
      if (!APPLY) continue
      const u = await upload("product-images", objectPath, imageFile(k))
      const { error: ie } = await supabase.from("product_images").insert({ product_id: product.id, image_url: u, sort_order: next++ })
      if (ie) throw ie
      alt[u] = altOf(k)
      applied.addedImages.push({ productId: product.id, image_url: u })
    }
  }

  // 4. Category moves
  console.log("\n=== CATEGORY MOVES ===")
  for (const mv of PLAN.moves) {
    const product = prodBySlug.get(mv.productSlug)
    if (!product) {
      console.log(`  skip (product not found) ${mv.productSlug}`)
      continue
    }
    const target = findCategory(mv.toCategory)
    if (product.category_id === target.id) {
      console.log(`  skip (already there) ${mv.productSlug}`)
      continue
    }
    const from = cats.find((c) => c.id === product.category_id)
    console.log(`  ${APPLY ? "move" : "would move"} ${mv.productSlug}: ${from?.slug ?? "?"} -> ${target.slug}`)
    if (!APPLY) continue
    const { error } = await supabase.from("products").update({ category_id: target.id }).eq("id", product.id)
    if (error) throw error
    applied.movedProducts.push({ productId: product.id, fromCategoryId: product.category_id })
  }

  // 5. Category covers (only where none)
  console.log("\n=== CATEGORY COVERS ===")
  for (const cv of PLAN.categoryCovers) {
    const cat = findCategory(cv.categorySlug)
    if (cat.cover_image_url) {
      console.log(`  skip (already has a cover) ${cat.slug}`)
      continue
    }
    console.log(`  ${APPLY ? "set" : "would set"} cover for ${cat.slug} <- ${cv.image}`)
    if (!APPLY) continue
    const u = await upload("category-images", `${cat.slug}-cover.jpg`, imageFile(cv.image))
    const { error } = await supabase.from("categories").update({ cover_image_url: u }).eq("id", cat.id)
    if (error) throw error
    applied.setCovers.push(cat.id)
  }

  if (APPLY) {
    mkdirSync(path.dirname(OUT_FILE), { recursive: true })
    const prev = existsSync(OUT_FILE) ? JSON.parse(readFileSync(OUT_FILE, "utf8")) : { createdCategories: [], createdProducts: [], movedProducts: [], addedImages: [], setCovers: [] }
    for (const k of Object.keys(applied)) prev[k] = [...prev[k], ...applied[k]]
    writeFileSync(OUT_FILE, JSON.stringify(prev, null, 2))
    writeFileSync(ALT_FILE, JSON.stringify(alt, null, 2))
    console.log(`\n[drive-import] Done. Rollback data: ${OUT_FILE}`)
  } else {
    console.log("\n[drive-import] Dry run only - nothing written. Re-run with --apply.")
  }
}

async function rollback() {
  if (!existsSync(OUT_FILE)) {
    console.log("Nothing to roll back (no applied file).")
    return
  }
  const a = JSON.parse(readFileSync(OUT_FILE, "utf8"))
  for (const m of a.movedProducts) await supabase.from("products").update({ category_id: m.fromCategoryId }).eq("id", m.productId)
  for (const i of a.addedImages) await supabase.from("product_images").delete().eq("product_id", i.productId).eq("image_url", i.image_url)
  for (const id of a.createdProducts) {
    await supabase.from("product_images").delete().eq("product_id", id)
    await supabase.from("products").delete().eq("id", id)
  }
  for (const id of a.setCovers) await supabase.from("categories").update({ cover_image_url: null }).eq("id", id)
  for (const id of a.createdCategories) await supabase.from("categories").delete().eq("id", id)
  console.log("Rolled back. (Storage objects are left in place; they are harmless.)")
}

main().catch((e) => {
  console.error("[drive-import] FAILED:", e.message ?? e)
  process.exit(1)
})

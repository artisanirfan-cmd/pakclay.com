// One-off import: "PakClay New Product images" supplied by Sylvester
// (2026-10-21) at "<repo root>/PakClay New Product images/" — 175 unique
// photos in 77 leaf folders, inventoried in that folder's _IMAGE_MANIFEST.csv
// (rel_path, hierarchy, group, file, ext, kb, dims, sha1). The 9 .zip files
// there are exact duplicates of the extracted folders and are ignored, as are
// the desktop.ini files (neither is in the manifest).
//
// Usage:
//   python -E -P scripts/prepare-pakclay-new-images.py "../PakClay New Product images" <processed-dir>
//   node scripts/import-pakclay-new-images.mjs <processed-dir>            # dry run, read-only
//   node scripts/import-pakclay-new-images.mjs <processed-dir> --apply    # writes
//
// <processed-dir> is the output of the Python step: <sha1>.<ext> files
// (resized to <=1600px, compressed) plus index.json.
//
// What it does (see 00-PROGRESS.md 2026-10-21 for the cross-check):
// - Builds the category branch in CATEGORIES below, reusing every row whose
//   slug already exists. "Terracotta Jali" is the EXISTING top-level row
//   (not a new child of Jali Wall Tiles) so the category isn't duplicated;
//   moving it is one parent_id change. The "Tuff Tiles" source level is
//   flattened into a `type = tuff-tile` product attribute, and "Pool Wall
//   and Floor Tiles" is flattened into Swimming Pool Tiles.
// - One product per leaf folder. The trailing "001" counter is dropped from
//   the name/slug when the remaining name is unique; when it isn't (17 x
//   "Terracotta Jali Tiles"), the counter stays in both, because duplicate
//   product titles are an seo-audit.mjs failure. If the counter still
//   doesn't make it unique (an "8x8 ... 001" in two categories), the
//   category's room qualifier is prefixed to that whole name group.
// - Skips folders whose photos are byte-identical (sha1) to a product that is
//   already live (KNOWN_EXISTING), and any slug that already exists.
// - First image = cover_image_url, the rest -> product_images, in filename
//   order — except images shared by several products (byte-identical), which
//   go last so each product's cover is its own photo. A shared file is
//   uploaded once and its URL reused.
// - Objects: product-images/products/<slug>/<slug>-<n>.<ext>. Always
//   getPublicUrl(), never a signed URL (batch 41).
// - Writes scripts/output/pakclay-new-images-alt-text.json (public URL ->
//   alt text from the original SEO filename): there is no alt-text column
//   yet, so this keeps the captions from being lost.
//
// Needs SUPABASE_SERVICE_ROLE_KEY in khaprail-website/.env. Idempotent:
// re-running reuses categories, skips existing product slugs, and re-uploads
// with upsert to the same deterministic paths. Deletes nothing it didn't just
// create (a product row is rolled back only if its own image rows fail).

import { createClient } from "@supabase/supabase-js"
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

try {
  process.loadEnvFile()
} catch {
  // No local .env — fine if the vars are already in process.env.
}

const WEBSITE_ROOT = path.resolve(fileURLToPath(import.meta.url), "../..")
const IMPORT_ROOT = path.resolve(WEBSITE_ROOT, "..", "PakClay New Product images")
const MANIFEST = path.join(IMPORT_ROOT, "_IMAGE_MANIFEST.csv")
const ALT_TEXT_OUT = path.join(WEBSITE_ROOT, "scripts", "output", "pakclay-new-images-alt-text.json")
const PRODUCT_BUCKET = "product-images"
const IMPORT_NOTE = "Imported from real product photography — needs a full description from Khaprail."
const SMALL_SIDE_PX = 600

const processedDir = process.argv[2]
const APPLY = process.argv.includes("--apply")

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error("[import] Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in khaprail-website/.env — aborting.")
  process.exit(1)
}
if (!existsSync(MANIFEST)) {
  console.error(`[import] Manifest not found: ${MANIFEST}`)
  process.exit(1)
}
if (!processedDir || !existsSync(path.join(processedDir, "index.json"))) {
  console.error(`[import] Processed image dir (with index.json) not found: ${processedDir}`)
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

// ---------------------------------------------------------------------------
// Category branch, parents before children. `reuse: true` rows must already
// exist (abort otherwise). New rows get sort_order = last sibling + 1.
// `qualifier` is only used to disambiguate product names (see header).
// ---------------------------------------------------------------------------

const CATEGORIES = [
  { slug: "wall-tiles", reuse: true },
  { slug: "bathroom-wall-tiles", reuse: true },
  { slug: "bathroom-wall-tiles-mosaic", name: "Mosaic Bathroom Wall Tiles", parent: "bathroom-wall-tiles", qualifier: "Bathroom" },
  { slug: "bathroom-wall-tiles-terracotta", reuse: true, qualifier: "Bathroom" },
  { slug: "outdoor-wall-tiles", reuse: true },
  // Open decision 4: Granite/Marble/Stone under Outdoor Wall Tiles vs main
  // Stone Tiles. The granite and marble folders are the already-live
  // Living Room Wall Tiles products (KNOWN_EXISTING), so these two stay
  // empty (hidden) until Sylvester decides whether to move those products.
  { slug: "outdoor-wall-tiles-granite", name: "Granite Outdoor Wall Tiles", parent: "outdoor-wall-tiles", qualifier: "Outdoor" },
  { slug: "outdoor-wall-tiles-marble", name: "Marble Outdoor Wall Tiles", parent: "outdoor-wall-tiles", qualifier: "Outdoor" },
  { slug: "outdoor-wall-tiles-stone", name: "Stone Outdoor Wall Tiles", parent: "outdoor-wall-tiles", qualifier: "Outdoor" },
  // Open decision 2: Jali Wall Tiles as a Wall Tiles child.
  { slug: "jali-wall-tiles", name: "Jali Wall Tiles", parent: "wall-tiles" },
  { slug: "jali-wall-tiles-cement", name: "Cement Jali", parent: "jali-wall-tiles" },
  { slug: "terracotta-jali", reuse: true },
  { slug: "floor-tiles", reuse: true },
  { slug: "bathroom-floor-tiles", reuse: true },
  { slug: "bathroom-floor-tiles-mosaic", name: "Mosaic Bathroom Floor Tiles", parent: "bathroom-floor-tiles", qualifier: "Bathroom" },
  { slug: "bathroom-floor-tiles-terracotta", name: "Terracotta Bathroom Floor Tiles", parent: "bathroom-floor-tiles", qualifier: "Bathroom" },
  { slug: "kitchen-floor-tiles", reuse: true },
  { slug: "kitchen-floor-tiles-terracotta", name: "Terracotta Kitchen Floor Tiles", parent: "kitchen-floor-tiles", qualifier: "Kitchen" },
  // Open decision 1: Living Room Floor Tiles is not in 12-CATEGORY-TAXONOMY.md.
  { slug: "living-room-floor-tiles", name: "Living Room Floor Tiles", parent: "floor-tiles" },
  { slug: "living-room-floor-tiles-terracotta", name: "Terracotta Living Room Floor Tiles", parent: "living-room-floor-tiles", qualifier: "Living Room" },
  { slug: "outdoor-floor-tiles", reuse: true },
  // Open decision 3: vs the existing (empty) Floor Tiles > Concrete Floor Tiles.
  { slug: "outdoor-floor-tiles-concrete", name: "Concrete Outdoor Floor Tiles", parent: "outdoor-floor-tiles" },
  { slug: "otti-tiles", name: "Otti Tiles", parent: "outdoor-floor-tiles-concrete", qualifier: "Outdoor" },
  { slug: "pavers-tiles", name: "Pavers Tiles", parent: "outdoor-floor-tiles-concrete", qualifier: "Outdoor" },
  { slug: "outdoor-floor-tiles-terracotta", name: "Terracotta Outdoor Floor Tiles", parent: "outdoor-floor-tiles", qualifier: "Outdoor" },
  { slug: "pool-tiles", reuse: true },
  { slug: "swimming-pool-tiles", name: "Swimming Pool Tiles", parent: "pool-tiles", qualifier: "Pool" },
  { slug: "terracotta-tiles", reuse: true },
]

// Manifest `hierarchy` minus its leaf folder (lowercased) -> category slug.
const SOURCE_TO_CATEGORY = {
  "bathroom wall tiles > mosaic bathroom wall tiles": { category: "bathroom-wall-tiles-mosaic" },
  "bathroom wall tiles > terracotta bathroom wall tiles": { category: "bathroom-wall-tiles-terracotta" },
  "granite outdoor wall tiles": { category: "outdoor-wall-tiles-granite" },
  "marble outdoor wall tiles": { category: "outdoor-wall-tiles-marble" },
  "stone outdoor wall tiles": { category: "outdoor-wall-tiles-stone" },
  "jali wall tiles > cement jali": { category: "jali-wall-tiles-cement" },
  "jali wall tiles > terracotta jali": { category: "terracotta-jali" },
  "floor tiles > bathroom floor tiles > mosaic bathroom floor tiles": { category: "bathroom-floor-tiles-mosaic" },
  "floor tiles > bathroom floor tiles > terracotta batroom floor tiles": { category: "bathroom-floor-tiles-terracotta" },
  "floor tiles > kitchen floor tiles > terracotta kitchen floor tiles": { category: "kitchen-floor-tiles-terracotta" },
  "floor tiles > living room floor tiles > terracotta living room floor tiles": { category: "living-room-floor-tiles-terracotta" },
  "floor tiles > outdoor floor tiles > concrete outdoor floor tiles > tuff tiles > otti tiles": {
    category: "otti-tiles",
    attributes: [{ attribute_type: "type", value: "tuff-tile" }],
  },
  "floor tiles > outdoor floor tiles > concrete outdoor floor tiles > tuff tiles > pavers tiles": {
    category: "pavers-tiles",
    attributes: [{ attribute_type: "type", value: "tuff-tile" }],
  },
  "floor tiles > outdoor floor tiles > terracotta outdoor floor tiles": { category: "outdoor-floor-tiles-terracotta" },
  "pool tiles > swimming pool tiles > pool wall and floor tiles": { category: "swimming-pool-tiles" },
  // The two loose root folders had no category given — flagged in 00-PROGRESS.md.
  "": { category: "terracotta-tiles", flag: "no category in source; placed under Terracotta Tiles" },
}

// Folders whose every photo is byte-identical (sha1) to a product already
// live from batch 42 ("project khaprail tiles/"). Re-importing them would
// create duplicate products under new names, so they are skipped.
const KNOWN_EXISTING = {
  "Multi Colors Granite Tiles 001": "multi-colors-granite-tiles",
  "Multi Colours Marble Outdoor Wall Tiles 001": "marble-living-room-wall-tiles",
  "12x12 inch terracotta tiles": "12x12-inch-terracotta-tiles",
}

// ---------------------------------------------------------------------------
// Name cleaning: fix the source typos, title-case, split off the counter.
// ---------------------------------------------------------------------------

const LOWERCASE_WORDS = new Set(["and", "of", "in", "for"])

function fixTypos(text) {
  return text
    .replace(/\bBatroom\b/gi, "Bathroom")
    .replace(/\bRectangulat\b/gi, "Rectangular")
    .replace(/\bFoor\b/gi, "Floor")
    .replace(/\b(\d+\s*x\s*\d+)\s*inc\b/gi, "$1 inch")
    .replace(/\s+/g, " ")
    .trim()
}

function titleCase(text) {
  return text
    .split(" ")
    .map((word, i) => {
      if (i > 0 && LOWERCASE_WORDS.has(word.toLowerCase())) return word.toLowerCase()
      if (/^\d+x\d+$/i.test(word)) return word.toLowerCase()
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(" ")
}

function splitCounter(folder) {
  const cleaned = titleCase(fixTypos(folder))
  const match = /^(.*?)\s+(\d{3})$/.exec(cleaned)
  return match ? { base: match[1], counter: match[2] } : { base: cleaned, counter: null }
}

// "8x8 inch" / "12x12 Inch" -> "8 X 8", matching the existing products' format.
function parseSize(name) {
  const match = /\b(\d+)\s*x\s*(\d+)\s*inch\b/i.exec(name)
  return match ? `${match[1]} X ${match[2]}` : null
}

function altFromFilename(file) {
  return fixTypos(file.replace(/\.[a-z0-9]+$/i, "")).replace(/\s+/g, " ")
}

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ""
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') quoted = false
      else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ",") {
      row.push(field)
      field = ""
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++
      row.push(field)
      if (row.some((f) => f !== "")) rows.push(row)
      row = []
      field = ""
    } else field += ch
  }
  if (field !== "" || row.length) rows.push([...row, field])
  const [header, ...body] = rows
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h.replace(/^﻿/, ""), r[i]])))
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

function buildPlan(manifestRows, processedIndex, existingProductSlugs) {
  const shaUseCount = new Map()
  for (const r of manifestRows) shaUseCount.set(r.sha1, (shaUseCount.get(r.sha1) ?? 0) + 1)

  const folders = new Map()
  for (const r of manifestRows) {
    const parts = r.hierarchy.split(" > ")
    const leaf = parts.at(-1)
    const sourceCategory = parts.slice(0, -1).join(" > ").toLowerCase()
    const key = r.hierarchy
    if (!folders.has(key)) folders.set(key, { leaf, sourceCategory, rows: [] })
    folders.get(key).rows.push(r)
  }

  const categoryBySlug = new Map(CATEGORIES.map((c) => [c.slug, c]))
  const items = []
  for (const folder of folders.values()) {
    const mapping = SOURCE_TO_CATEGORY[folder.sourceCategory]
    if (!mapping) throw new Error(`No category mapping for source "${folder.sourceCategory}" (folder "${folder.leaf}") — aborting rather than guessing.`)
    const { base, counter } = splitCounter(folder.leaf)
    const files = [...folder.rows].sort((a, b) => {
      const sharedA = shaUseCount.get(a.sha1) > 1 ? 1 : 0
      const sharedB = shaUseCount.get(b.sha1) > 1 ? 1 : 0
      return sharedA - sharedB || a.file.localeCompare(b.file)
    })
    for (const f of files) {
      if (!processedIndex[f.sha1]) throw new Error(`Processed file missing for ${f.rel_path} (${f.sha1})`)
    }
    items.push({
      leaf: folder.leaf,
      base,
      counter,
      categorySlug: mapping.category,
      qualifier: categoryBySlug.get(mapping.category)?.qualifier ?? null,
      attributes: mapping.attributes ?? [],
      flag: mapping.flag ?? null,
      files,
      knownExisting: KNOWN_EXISTING[folder.leaf] ?? null,
    })
  }

  // Names/slugs: see header for the rules.
  const groups = new Map()
  for (const item of items.filter((i) => !i.knownExisting)) {
    const key = slugify(item.base)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(item)
  }
  for (const group of groups.values()) {
    if (group.length === 1) {
      group[0].name = group[0].base
      continue
    }
    const withCounter = group.map((i) => slugify(`${i.base} ${i.counter ?? ""}`))
    const needsQualifier = new Set(withCounter).size !== withCounter.length
    for (const item of group) {
      const prefix = needsQualifier ? `${item.qualifier} ` : ""
      item.name = `${prefix}${item.base}${item.counter ? ` ${item.counter}` : ""}`
    }
    const slugs = group.map((i) => slugify(i.name))
    if (new Set(slugs).size !== slugs.length) throw new Error(`Could not make names unique for "${group[0].base}"`)
  }

  // Shared images: owned (uploaded) by the first non-skipped product in plan order.
  const sharedOwner = new Map()
  for (const item of items) {
    if (item.knownExisting) {
      item.slug = item.knownExisting
      item.skipReason = `photos already live as product "${item.knownExisting}"`
      continue
    }
    item.slug = slugify(item.name)
    item.size = parseSize(item.name)
    if (existingProductSlugs.has(item.slug)) item.skipReason = "slug already exists"
    item.images = item.files.map((f, i) => {
      const ext = processedIndex[f.sha1].ext
      const ownPath = `products/${item.slug}/${item.slug}-${i + 1}.${ext}`
      if (shaUseCount.get(f.sha1) > 1 && !sharedOwner.has(f.sha1)) sharedOwner.set(f.sha1, ownPath)
      const objectPath = shaUseCount.get(f.sha1) > 1 ? sharedOwner.get(f.sha1) : ownPath
      return {
        sha1: f.sha1,
        ext,
        objectPath,
        reused: objectPath !== ownPath,
        alt: altFromFilename(f.file),
        sourceDims: f.dims,
        sourceFile: f.rel_path,
      }
    })
  }
  return items
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

async function fetchAll(table, columns) {
  const { data, error } = await supabase.from(table).select(columns)
  if (error) throw error
  return data
}

async function ensureCategories(existingCategories) {
  const bySlug = new Map(existingCategories.map((c) => [c.slug, c]))
  const results = []
  for (const plan of CATEGORIES) {
    const existing = bySlug.get(plan.slug)
    if (existing) {
      if (plan.parent && bySlug.get(plan.parent)?.id !== existing.parent_id) {
        console.warn(`[category] WARNING: "${plan.slug}" exists with a different parent than planned — reused as-is.`)
      }
      results.push({ slug: plan.slug, name: existing.name, action: "reuse" })
      continue
    }
    if (plan.reuse) throw new Error(`Category "${plan.slug}" expected to exist but doesn't — aborting.`)
    const parent = bySlug.get(plan.parent)
    if (!parent) throw new Error(`Parent "${plan.parent}" of "${plan.slug}" not found — aborting.`)
    // Never duplicate a category: same name under the same parent counts as existing.
    const sameName = existingCategories.find((c) => c.parent_id === parent.id && c.name.toLowerCase() === plan.name.toLowerCase())
    if (sameName) {
      bySlug.set(plan.slug, sameName)
      results.push({ slug: sameName.slug, name: sameName.name, action: "reuse (same name)" })
      continue
    }
    const siblings = [...bySlug.values()].filter((c) => c.parent_id === parent.id)
    const sortOrder = siblings.reduce((max, c) => Math.max(max, c.sort_order ?? 0), 0) + 1
    let row = { id: `(new:${plan.slug})`, name: plan.name, slug: plan.slug, parent_id: parent.id, sort_order: sortOrder }
    if (APPLY) {
      const { data, error } = await supabase
        .from("categories")
        .insert({ name: plan.name, slug: plan.slug, parent_id: parent.id, sort_order: sortOrder, cover_image_url: null })
        .select("id, name, slug, parent_id, sort_order")
        .single()
      if (error) throw error
      row = data
    }
    bySlug.set(plan.slug, row)
    existingCategories.push(row)
    results.push({ slug: plan.slug, name: plan.name, action: APPLY ? `created (sort ${sortOrder})` : `would create (sort ${sortOrder})` })
  }
  return { bySlug, results }
}

const CONTENT_TYPES = { jpg: "image/jpeg", webp: "image/webp", png: "image/png" }

async function createProduct(item, category, uploadedThisRun, altText) {
  const urls = []
  for (const image of item.images) {
    if (!uploadedThisRun.has(image.objectPath)) {
      const buffer = readFileSync(path.join(processedDir, `${image.sha1}.${image.ext}`))
      const { error } = await supabase.storage.from(PRODUCT_BUCKET).upload(image.objectPath, buffer, {
        contentType: CONTENT_TYPES[image.ext],
        cacheControl: "3600",
        upsert: true,
      })
      if (error) throw new Error(`Upload failed for ${image.sourceFile}: ${error.message}`)
      uploadedThisRun.add(image.objectPath)
    }
    const { data: pub } = supabase.storage.from(PRODUCT_BUCKET).getPublicUrl(image.objectPath)
    urls.push(pub.publicUrl)
    altText[pub.publicUrl] ??= image.alt
  }

  const [coverUrl, ...galleryUrls] = urls
  const { data: productRow, error: productError } = await supabase
    .from("products")
    .insert({
      name: item.name,
      slug: item.slug,
      description: IMPORT_NOTE,
      size: item.size,
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

  try {
    if (galleryUrls.length > 0) {
      const rows = galleryUrls.map((image_url, i) => ({ product_id: productRow.id, image_url, sort_order: i }))
      const { error } = await supabase.from("product_images").insert(rows)
      if (error) throw error
    }
    if (item.attributes.length > 0) {
      const rows = item.attributes.map((a) => ({ product_id: productRow.id, ...a }))
      const { error } = await supabase.from("product_attributes").insert(rows)
      if (error) throw error
    }
  } catch (err) {
    // Roll back only the row this run just created, so a re-run can retry it.
    await supabase.from("product_images").delete().eq("product_id", productRow.id)
    await supabase.from("product_attributes").delete().eq("product_id", productRow.id)
    await supabase.from("products").delete().eq("id", productRow.id)
    throw err
  }
}

// ---------------------------------------------------------------------------

async function main() {
  console.log(`[import] Source: ${IMPORT_ROOT}`)
  console.log(`[import] Mode: ${APPLY ? "APPLY (writes)" : "DRY RUN (read-only)"}`)

  const manifestRows = parseCsv(readFileSync(MANIFEST, "utf8"))
  const processedIndex = JSON.parse(readFileSync(path.join(processedDir, "index.json"), "utf8"))
  const existingProducts = await fetchAll("products", "slug")
  const existingCategories = await fetchAll("categories", "id, name, slug, parent_id, sort_order")

  const items = buildPlan(manifestRows, processedIndex, new Set(existingProducts.map((p) => p.slug)))
  const { bySlug, results: categoryResults } = await ensureCategories(existingCategories)

  console.log("\n=== CATEGORIES ===")
  for (const r of categoryResults) console.log(`  ${r.action.padEnd(24)} ${r.slug}  (${r.name})`)

  const pathOf = (slug) => {
    const names = []
    let current = bySlug.get(slug)
    const byId = new Map([...bySlug.values()].map((c) => [c.id, c]))
    while (current) {
      names.unshift(current.name)
      current = current.parent_id ? byId.get(current.parent_id) : null
    }
    return names.join(" > ")
  }

  console.log("\n=== PRODUCTS (category -> product -> images) ===")
  let lastCategory = null
  for (const item of [...items].sort((a, b) => pathOf(a.categorySlug).localeCompare(pathOf(b.categorySlug)) || (a.name ?? a.leaf).localeCompare(b.name ?? b.leaf))) {
    const catPath = pathOf(item.categorySlug)
    if (catPath !== lastCategory) {
      console.log(`\n  ${catPath}`)
      lastCategory = catPath
    }
    if (item.skipReason) {
      console.log(`    SKIP  ${item.leaf}  — ${item.skipReason}`)
      continue
    }
    const reused = item.images.filter((i) => i.reused).length
    const extras = [item.size && `size ${item.size}`, reused && `${reused} reused`, item.attributes.length && "type=tuff-tile", item.flag].filter(Boolean)
    console.log(`    ${String(item.images.length).padStart(2)}  ${item.name}  [${item.slug}]${extras.length ? `  (${extras.join("; ")})` : ""}`)
  }

  const toCreate = items.filter((i) => !i.skipReason)
  const imageRefs = toCreate.reduce((n, i) => n + i.images.length, 0)
  const uniqueUploads = new Set(toCreate.flatMap((i) => i.images.map((im) => im.objectPath))).size
  const smallImages = manifestRows.filter((r) => Math.min(...r.dims.split("x").map(Number)) < SMALL_SIDE_PX)

  console.log("\n=== SMALL SOURCE IMAGES (short side < 600px) ===")
  for (const r of smallImages) console.log(`  ${r.dims.padEnd(9)} ${r.hierarchy.split(" > ").at(-1)} / ${r.file}`)

  console.log("\n=== TOTALS ===")
  console.log(`Leaf folders: ${items.length}; products to create: ${toCreate.length}; skipped: ${items.length - toCreate.length}`)
  console.log(`Image references: ${imageRefs}; unique files to upload: ${uniqueUploads}`)
  console.log(`Small source images: ${smallImages.length}`)

  if (!APPLY) {
    console.log("\nDry run only — nothing written. Re-run with --apply to import.")
    return
  }

  const uploadedThisRun = new Set()
  const altText = existsSync(ALT_TEXT_OUT) ? JSON.parse(readFileSync(ALT_TEXT_OUT, "utf8")) : {}
  let created = 0
  for (const item of toCreate) {
    await createProduct(item, bySlug.get(item.categorySlug), uploadedThisRun, altText)
    created++
    console.log(`[product] created: ${item.name} — ${item.images.length} image(s)`)
  }
  mkdirSync(path.dirname(ALT_TEXT_OUT), { recursive: true })
  writeFileSync(ALT_TEXT_OUT, JSON.stringify(altText, null, 1) + "\n")
  console.log(`\n=== DONE === products created: ${created}; files uploaded this run: ${uploadedThisRun.size}; alt text -> ${path.relative(WEBSITE_ROOT, ALT_TEXT_OUT)}`)
}

main().catch((err) => {
  console.error("[import] FAILED:", err)
  process.exit(1)
})

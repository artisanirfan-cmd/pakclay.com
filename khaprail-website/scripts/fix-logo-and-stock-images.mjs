// Step 2 of 2 for the batch 54 logo/watermark + off-brand product image fixes
// (2026-10-30). Step 1 (crops) is scripts/prepare-logo-crops.py; both read
// scripts/logo-image-fixes.plan.json. Decisions: 00-PROGRESS.md batch 54.
//
// Usage:
//   node scripts/fix-logo-and-stock-images.mjs <crops-dir> [--dry-run]   (default: dry run)
//   node scripts/fix-logo-and-stock-images.mjs <crops-dir> --apply
//   node scripts/fix-logo-and-stock-images.mjs --rollback [--apply]
//
// --apply, in order:
//   crops   copy the original object to products/_originals/<same path>, upload
//           the cropped file as <name>-cropped.jpg next to it (new object, the
//           original is never overwritten), and repoint every products.cover_image_url
//           / product_images.image_url that used the original URL.
//   covers  set a product's cover to its first gallery photo (sort_order).
//   hides   move each matching product_images row into product_images_hidden
//           (same url/sort_order, original row id kept). A matching cover is
//           archived with was_cover = true and replaced by the product's first
//           remaining gallery photo. Storage objects are never deleted.
// A product that would be left with zero visible images aborts the run
// before anything is written for it.
//
// Every change is appended to scripts/output/logo-image-changes.json;
// --rollback replays it in reverse. Idempotent: rows already in the target
// state are skipped, existing objects are reused.
//
// Needs SUPABASE_SERVICE_ROLE_KEY in khaprail-website/.env.

import { createClient } from "@supabase/supabase-js"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

try {
  process.loadEnvFile()
} catch {
  // No local .env — fine if the vars are already in process.env.
}

const WEBSITE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const PLAN = JSON.parse(readFileSync(path.join(WEBSITE_ROOT, "scripts", "logo-image-fixes.plan.json"), "utf8"))
const CHANGES_FILE = path.join(WEBSITE_ROOT, "scripts", "output", "logo-image-changes.json")
const BUCKET = "product-images"

const APPLY = process.argv.includes("--apply")
const ROLLBACK = process.argv.includes("--rollback")
const cropsDir = process.argv.slice(2).find((a) => !a.startsWith("--"))
const mode = APPLY ? "APPLY" : "DRY RUN"

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error("[logo-fix] Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in khaprail-website/.env — aborting.")
  process.exit(1)
}
const supabase = createClient(url, serviceKey)
const publicUrl = (p) => supabase.storage.from(BUCKET).getPublicUrl(p).data.publicUrl
const changes = existsSync(CHANGES_FILE) ? JSON.parse(readFileSync(CHANGES_FILE, "utf8")) : []
const record = (c) => {
  changes.push({ ...c, at: new Date().toISOString() })
  writeFileSync(CHANGES_FILE, JSON.stringify(changes, null, 1) + "\n")
}

function must({ data, error }, what) {
  if (error) throw new Error(`${what}: ${error.message}`)
  return data
}

async function objectExists(p) {
  const dir = path.posix.dirname(p)
  const data = must(await supabase.storage.from(BUCKET).list(dir, { search: path.posix.basename(p) }), `list ${dir}`)
  return data.some((o) => o.name === path.posix.basename(p))
}

async function visibleImages(productId) {
  const p = must(await supabase.from("products").select("id, slug, cover_image_url").eq("id", productId).single(), "product")
  const g = must(await supabase.from("product_images").select("id, image_url, sort_order").eq("product_id", productId).order("sort_order"), "gallery")
  return { product: p, gallery: g }
}

async function repoint(oldUrl, newUrl, kind) {
  const covers = must(await supabase.from("products").select("id, slug").eq("cover_image_url", oldUrl), "covers")
  const gallery = must(await supabase.from("product_images").select("id, product_id").eq("image_url", oldUrl), "gallery rows")
  for (const p of covers) {
    console.log(`    ${APPLY ? "repointed" : "would repoint"} cover of ${p.slug}`)
    if (APPLY) {
      record({ kind, table: "products", id: p.id, column: "cover_image_url", oldUrl, newUrl })
      must(await supabase.from("products").update({ cover_image_url: newUrl }).eq("id", p.id), "update cover")
    }
  }
  for (const r of gallery) {
    console.log(`    ${APPLY ? "repointed" : "would repoint"} gallery row ${r.id}`)
    if (APPLY) {
      record({ kind, table: "product_images", id: r.id, column: "image_url", oldUrl, newUrl })
      must(await supabase.from("product_images").update({ image_url: newUrl }).eq("id", r.id), "update gallery")
    }
  }
  return covers.length + gallery.length
}

async function run() {
  if (!cropsDir || !existsSync(path.join(cropsDir, "index.json"))) {
    console.error(`[logo-fix] Crops dir (with index.json from prepare-logo-crops.py) not found: ${cropsDir}`)
    process.exit(1)
  }
  const index = JSON.parse(readFileSync(path.join(cropsDir, "index.json"), "utf8"))
  const counts = { cropped: 0, repointed: 0, covers: 0, hidden: 0, promoted: [] }
  console.log(`[logo-fix] ${mode}`)

  console.log("\n== crops")
  for (const c of PLAN.crops) {
    const oldUrl = publicUrl(c.path)
    const croppedPath = c.path.replace(/\.[a-z]+$/i, "-cropped.jpg")
    const originalCopy = `products/_originals/${c.path.replace(/^products\//, "")}`
    const info = index[String(c.manifest)]
    console.log(`#${c.manifest} ${c.path} -> ${path.posix.basename(croppedPath)} (${info.width}x${info.height}, ${info.kb} KB; removes ${c.removes})`)
    if (!(await objectExists(originalCopy))) {
      console.log(`    ${APPLY ? "copied" : "would copy"} original -> ${originalCopy}`)
      if (APPLY) must(await supabase.storage.from(BUCKET).copy(c.path, originalCopy), `copy ${c.path}`)
    }
    if (!(await objectExists(croppedPath))) {
      console.log(`    ${APPLY ? "uploaded" : "would upload"} ${croppedPath}`)
      if (APPLY) {
        must(await supabase.storage.from(BUCKET).upload(croppedPath, readFileSync(path.join(cropsDir, `${c.manifest}.jpg`)), { contentType: "image/jpeg", upsert: false }), `upload ${croppedPath}`)
      }
    }
    const n = await repoint(oldUrl, publicUrl(croppedPath), "crop")
    if (n === 0) console.log("    already done (no row uses the original URL)")
    else counts.cropped++, (counts.repointed += n)
  }

  console.log("\n== covers from first gallery photo")
  for (const c of PLAN.coverFromFirstGallery) {
    const p = must(await supabase.from("products").select("id, slug, cover_image_url").eq("slug", c.slug).single(), c.slug)
    const { gallery } = await visibleImages(p.id)
    if (!gallery.length) throw new Error(`${c.slug} has no gallery photo to promote`)
    if (p.cover_image_url === gallery[0].image_url) {
      console.log(`${c.slug}: already done`)
      continue
    }
    console.log(`${c.slug}: ${APPLY ? "cover set" : "would set cover"} -> ${gallery[0].image_url}\n    (was ${p.cover_image_url})`)
    counts.covers++
    if (APPLY) {
      record({ kind: "cover", table: "products", id: p.id, column: "cover_image_url", oldUrl: p.cover_image_url, newUrl: gallery[0].image_url })
      must(await supabase.from("products").update({ cover_image_url: gallery[0].image_url }).eq("id", p.id), "update cover")
    }
  }

  console.log("\n== hides")
  for (const h of PLAN.hides) {
    const hideUrl = publicUrl(h.path)
    const rows = must(await supabase.from("product_images").select("id, product_id, image_url, sort_order").eq("image_url", hideUrl), "gallery rows")
    const covers = must(await supabase.from("products").select("id, slug, cover_image_url").eq("cover_image_url", hideUrl), "covers")
    console.log(`${h.manifest ? `#${h.manifest} ` : ""}${h.path} (${h.reason})`)
    if (!rows.length && !covers.length) {
      console.log("    already done")
      continue
    }
    const productIds = [...new Set([...rows.map((r) => r.product_id), ...covers.map((p) => p.id)])]
    for (const productId of productIds) {
      const { product, gallery } = await visibleImages(productId)
      const remainingGallery = gallery.filter((g) => g.image_url !== hideUrl)
      const coverHidden = product.cover_image_url === hideUrl
      const newCover = coverHidden ? (remainingGallery[0]?.image_url ?? null) : product.cover_image_url
      const visible = new Set([newCover, ...remainingGallery.map((g) => g.image_url)].filter(Boolean))
      if (visible.size === 0) throw new Error(`${product.slug} would be left with zero visible images — not hiding ${h.path}`)
      for (const r of gallery.filter((g) => g.image_url === hideUrl)) {
        console.log(`    ${APPLY ? "hid" : "would hide"} gallery row of ${product.slug} (sort ${r.sort_order})`)
        counts.hidden++
        if (APPLY) {
          const archived = must(await supabase.from("product_images_hidden").insert({ product_id: productId, image_url: hideUrl, sort_order: r.sort_order, was_cover: false, original_row_id: r.id, reason: h.reason }).select("id").single(), "archive row")
          record({ kind: "hide", archivedId: archived.id, productId, originalRowId: r.id, imageUrl: hideUrl, sortOrder: r.sort_order })
          must(await supabase.from("product_images").delete().eq("id", r.id), "remove gallery row")
        }
      }
      if (coverHidden) {
        console.log(`    ${APPLY ? "hid" : "would hide"} COVER of ${product.slug}; new cover ${newCover}`)
        counts.hidden++
        counts.promoted.push(product.slug)
        if (APPLY) {
          const archived = must(await supabase.from("product_images_hidden").insert({ product_id: productId, image_url: hideUrl, was_cover: true, reason: h.reason }).select("id").single(), "archive cover")
          record({ kind: "hide-cover", archivedId: archived.id, productId, oldUrl: hideUrl, newUrl: newCover })
          must(await supabase.from("products").update({ cover_image_url: newCover }).eq("id", productId), "promote cover")
        }
      }
      console.log(`    ${product.slug}: ${visible.size} visible image(s) after`)
    }
  }

  console.log(`\n[logo-fix] ${mode} summary: ${counts.cropped} image(s) cropped (${counts.repointed} row(s) repointed), ${counts.covers} cover swap(s), ${counts.hidden} image(s) hidden; lost primary image: ${counts.promoted.join(", ") || "none"}.`)
  if (!APPLY) console.log("[logo-fix] Nothing was written. Re-run with --apply to perform these changes.")
}

async function runRollback() {
  console.log(`[logo-fix] ${mode}: rollback of ${changes.length} change(s)`)
  for (const c of [...changes].reverse()) {
    if (c.kind === "hide") {
      console.log(`  ${APPLY ? "restored" : "would restore"} gallery row ${c.originalRowId}`)
      if (APPLY) {
        must(await supabase.from("product_images").upsert({ id: c.originalRowId, product_id: c.productId, image_url: c.imageUrl, sort_order: c.sortOrder }), "restore row")
        must(await supabase.from("product_images_hidden").delete().eq("id", c.archivedId), "unarchive")
      }
    } else if (c.kind === "hide-cover") {
      console.log(`  ${APPLY ? "restored" : "would restore"} cover ${c.oldUrl}`)
      if (APPLY) {
        must(await supabase.from("products").update({ cover_image_url: c.oldUrl }).eq("id", c.productId), "restore cover")
        must(await supabase.from("product_images_hidden").delete().eq("id", c.archivedId), "unarchive")
      }
    } else {
      console.log(`  ${APPLY ? "restored" : "would restore"} ${c.table} ${c.id}.${c.column} -> ${c.oldUrl}`)
      if (APPLY) must(await supabase.from(c.table).update({ [c.column]: c.oldUrl }).eq("id", c.id), "restore url")
    }
  }
  if (APPLY) writeFileSync(CHANGES_FILE, "[]\n")
  console.log("  (uploaded -cropped.jpg and _originals/ copies are left in Storage)")
}

;(ROLLBACK ? runRollback() : run()).catch((e) => {
  console.error(`[logo-fix] FAILED: ${e.message}`)
  process.exit(1)
})

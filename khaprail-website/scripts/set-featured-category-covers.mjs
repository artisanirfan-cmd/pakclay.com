// One-off: set the 11 homepage "Featured Categories" cover photos supplied
// by Sylvester at "<repo root>/Featured Categories/<Category Name>/".
//
// Usage: node scripts/set-featured-category-covers.mjs <processed-dir>
//
// <processed-dir> holds the already resized/compressed JPEGs, one per
// category, named `<slug>.jpg` (single extension — not the doubled
// `.jpg.jpg` seed bug, UX_AUDIT_REPORT.md finding 1.8). These render at only
// 80–112px in CategoryBadgeCircle, so ~800px wide is plenty.
//
// Uploads to the existing public `category-images` bucket (same bucket every
// other category cover uses) as `<slug>.jpg`, then sets that category's
// `cover_image_url` from `getPublicUrl()` — never a signed URL (batch 41).
// Unlike batch 51's script this DOES overwrite an existing cover: Sylvester
// asked for all 11 to use the new photography (2026-10-14).
//
// Needs SUPABASE_SERVICE_ROLE_KEY in khaprail-website/.env. Idempotent
// (upsert upload, plain update).

import { createClient } from "@supabase/supabase-js"
import { readdirSync, readFileSync, existsSync } from "node:fs"
import path from "node:path"

try {
  process.loadEnvFile()
} catch {
  // No local .env — fine if the vars are already in process.env.
}

const CATEGORY_BUCKET = "category-images"
const SLUGS = [
  "bathroom-tiles",
  "brick-tiles",
  "khaprail-tiles",
  "kitchen-tiles",
  "mosaic-tiles",
  "outdoor-tiles",
  "pool-tiles",
  "roof-tiles",
  "stone-tiles",
  "terracotta-jali",
  "terracotta-tiles",
]

const dir = process.argv[2]
const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error("[covers] Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in khaprail-website/.env — aborting.")
  process.exit(1)
}
if (!dir || !existsSync(dir)) {
  console.error(`[covers] Processed image dir not found: ${dir}`)
  process.exit(1)
}

const present = new Set(readdirSync(dir))
const missing = SLUGS.filter((slug) => !present.has(`${slug}.jpg`))
if (missing.length) {
  console.error(`[covers] Missing processed files: ${missing.join(", ")}`)
  process.exit(1)
}

const supabase = createClient(url, serviceKey)

for (const slug of SLUGS) {
  const { data: category, error: fetchError } = await supabase
    .from("categories")
    .select("id, name, cover_image_url")
    .eq("slug", slug)
    .is("parent_id", null)
    .single()
  if (fetchError) throw new Error(`Category ${slug}: ${fetchError.message}`)

  const objectPath = `${slug}.jpg`
  const { error: uploadError } = await supabase.storage
    .from(CATEGORY_BUCKET)
    .upload(objectPath, readFileSync(path.join(dir, objectPath)), {
      contentType: "image/jpeg",
      cacheControl: "3600",
      upsert: true,
    })
  if (uploadError) throw new Error(`Upload failed for ${objectPath}: ${uploadError.message}`)
  const { data: pub } = supabase.storage.from(CATEGORY_BUCKET).getPublicUrl(objectPath)

  const { error: updateError } = await supabase
    .from("categories")
    .update({ cover_image_url: pub.publicUrl })
    .eq("id", category.id)
  if (updateError) throw updateError

  console.log(`[covers] ${category.name}: ${category.cover_image_url ?? "(none)"} -> ${pub.publicUrl}`)
}

// Step 2 of 2 for the batch 54 AI/placeholder image replacement (2026-10-30).
// Step 1 (resize) is scripts/prepare-ai-image-replacements.py; both read
// scripts/ai-image-replacements.plan.json. Audit + reasoning per slot:
// scripts/output/ai-image-audit.md.
//
// Usage:
//   node scripts/replace-ai-images.mjs <processed-dir> [--dry-run]   (default: dry run)
//   node scripts/replace-ai-images.mjs <processed-dir> --apply
//   node scripts/replace-ai-images.mjs --rollback [--apply]          (DB rows only)
//
// What --apply does, per plan slot:
//   1. uploads <processed-dir>/<slot id>.jpg to <bucket>/<path> (new object
//      names; an existing object at that path is left alone and reused), or
//      uses the slot's `reuseUrl` for an image that is already live;
//   2. points each listed row's image column at the getPublicUrl() URL (never
//      a signed URL, batch 41) and sets its alt-text column when given.
// Then, per plan asset (hero/heritage), copies the prepared variants over
// src/assets/<prefix>-{640,960,1600}.webp and -1280.jpg. Old asset files
// stay recoverable from git (the commit is recorded in the rollback file).
//
// Every row's ORIGINAL url/alt goes to scripts/output/ai-image-replacements.json
// the first time it changes. Re-runs keep that first value, so --rollback
// always restores the pre-batch state. Nothing is deleted from Storage: the
// old AI objects stay in their buckets until someone removes them by hand.
//
// Idempotent: rows already at the target URL/alt are skipped, uploads skip
// existing objects, identical asset files are not rewritten.
//
// Needs SUPABASE_SERVICE_ROLE_KEY in khaprail-website/.env.

import { createClient } from "@supabase/supabase-js"
import { execSync } from "node:child_process"
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

try {
  process.loadEnvFile()
} catch {
  // No local .env — fine if the vars are already in process.env.
}

const WEBSITE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const PLAN = JSON.parse(readFileSync(path.join(WEBSITE_ROOT, "scripts", "ai-image-replacements.plan.json"), "utf8"))
const ROLLBACK_FILE = path.join(WEBSITE_ROOT, "scripts", "output", "ai-image-replacements.json")
const ASSETS_DIR = path.join(WEBSITE_ROOT, "src", "assets")

const APPLY = process.argv.includes("--apply")
const ROLLBACK = process.argv.includes("--rollback")
const processedDir = process.argv.slice(2).find((a) => !a.startsWith("--"))
const mode = APPLY ? "APPLY" : "DRY RUN"

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error("[replace] Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in khaprail-website/.env — aborting.")
  process.exit(1)
}
const supabase = createClient(url, serviceKey)

const rollback = existsSync(ROLLBACK_FILE) ? JSON.parse(readFileSync(ROLLBACK_FILE, "utf8")) : { rows: [], assets: [] }
const rowKey = (r) => `${r.table}:${JSON.stringify(r.match ?? { id: r.id })}:${r.column}`

async function fetchRow(r) {
  const match = r.match ?? { id: r.id }
  const cols = ["id", r.column, r.altColumn].filter(Boolean).join(", ")
  const { data, error } = await supabase.from(r.table).select(cols).match(match)
  if (error) throw new Error(`${r.table} ${JSON.stringify(match)}: ${error.message}`)
  if (data.length !== 1) throw new Error(`${r.table} ${JSON.stringify(match)}: expected 1 row, got ${data.length}`)
  return data[0]
}

async function objectExists(bucket, objectPath) {
  const dir = path.posix.dirname(objectPath)
  const { data, error } = await supabase.storage.from(bucket).list(dir === "." ? "" : dir, { search: path.posix.basename(objectPath) })
  if (error) throw new Error(`list ${bucket}/${dir}: ${error.message}`)
  return data.some((o) => o.name === path.posix.basename(objectPath))
}

async function updateRow(r, current, newUrl, newAlt) {
  const patch = { [r.column]: newUrl }
  if (r.altColumn && newAlt !== undefined) patch[r.altColumn] = newAlt
  const { error } = await supabase.from(r.table).update(patch).eq("id", current.id)
  if (error) throw new Error(`update ${r.table} ${current.id}: ${error.message}`)
}

function saveRollback() {
  writeFileSync(ROLLBACK_FILE, JSON.stringify(rollback, null, 1) + "\n")
}

async function runRollback() {
  console.log(`[replace] ${mode}: rollback of ${rollback.rows.length} row(s) from ${path.relative(WEBSITE_ROOT, ROLLBACK_FILE)}`)
  for (const entry of rollback.rows) {
    const current = await fetchRow(entry.row)
    const same = current[entry.row.column] === entry.oldUrl && (!entry.row.altColumn || current[entry.row.altColumn] === entry.oldAlt)
    console.log(`  ${same ? "already restored" : APPLY ? "restored" : "would restore"}  ${entry.row.table} ${current.id} -> ${entry.oldUrl}`)
    if (!same && APPLY) await updateRow(entry.row, current, entry.oldUrl, entry.row.altColumn ? entry.oldAlt : undefined)
  }
  if (rollback.assets.length) {
    console.log(`  src/assets: restore with  git checkout ${rollback.assets[0].gitCommit} -- ${rollback.assets.map((a) => a.file).join(" ")}`)
  }
}

async function run() {
  if (!processedDir || !existsSync(path.join(processedDir, "index.json"))) {
    console.error(`[replace] Processed dir (with index.json from prepare-ai-image-replacements.py) not found: ${processedDir}`)
    process.exit(1)
  }
  const index = JSON.parse(readFileSync(path.join(processedDir, "index.json"), "utf8"))
  console.log(`[replace] ${mode}`)
  const counts = { uploads: 0, rows: 0, skipped: 0, assets: 0 }

  for (const slot of PLAN.slots) {
    let newUrl = slot.reuseUrl
    if (!newUrl) {
      const file = path.join(processedDir, `${slot.id}.jpg`)
      if (!existsSync(file)) throw new Error(`missing prepared file ${file}`)
      newUrl = supabase.storage.from(slot.bucket).getPublicUrl(slot.path).data.publicUrl
      const exists = await objectExists(slot.bucket, slot.path)
      const info = index[slot.id]
      console.log(`\n[${slot.id}] manifest #${slot.manifest} (${info.width}x${info.height}, ${info.kb} KB) -> ${slot.bucket}/${slot.path}: ${exists ? "object exists, reused" : APPLY ? "uploaded" : "would upload"}`)
      if (!exists) {
        counts.uploads++
        if (APPLY) {
          const { error } = await supabase.storage.from(slot.bucket).upload(slot.path, readFileSync(file), { contentType: "image/jpeg", upsert: false })
          if (error) throw new Error(`upload ${slot.bucket}/${slot.path}: ${error.message}`)
        }
      }
    } else {
      console.log(`\n[${slot.id}] reuse existing ${newUrl}`)
    }

    for (const r of slot.rows) {
      const current = await fetchRow(r)
      const oldUrl = current[r.column]
      const oldAlt = r.altColumn ? current[r.altColumn] : undefined
      const altChanges = r.altColumn && r.alt !== undefined && oldAlt !== r.alt
      if (oldUrl === newUrl && !altChanges) {
        counts.skipped++
        console.log(`  already done  ${r.table} ${current.id}`)
        continue
      }
      counts.rows++
      console.log(`  ${APPLY ? "updated" : "would update"}  ${r.table} ${current.id}.${r.column}\n      old: ${oldUrl}\n      new: ${newUrl}`)
      if (altChanges) console.log(`      alt: "${oldAlt}" -> "${r.alt}"`)
      if (APPLY) {
        if (!rollback.rows.some((e) => rowKey(e.row) === rowKey(r))) {
          rollback.rows.push({ slot: slot.id, row: r, id: current.id, oldUrl, oldAlt: oldAlt ?? null, newUrl, newAlt: r.alt ?? null, at: new Date().toISOString() })
          saveRollback()
        }
        await updateRow(r, current, newUrl, r.alt)
      }
    }
  }

  const gitCommit = execSync("git rev-parse HEAD", { cwd: WEBSITE_ROOT }).toString().trim()
  for (const asset of PLAN.assets ?? []) {
    console.log(`\n[${asset.id}] manifest #${asset.manifest} -> src/assets/${asset.prefix}-*`)
    for (const name of [`${asset.prefix}-640.webp`, `${asset.prefix}-960.webp`, `${asset.prefix}-1600.webp`, `${asset.prefix}-1280.jpg`]) {
      const from = path.join(processedDir, "assets", name)
      const to = path.join(ASSETS_DIR, name)
      if (!existsSync(from)) throw new Error(`missing prepared asset ${from}`)
      if (existsSync(to) && readFileSync(from).equals(readFileSync(to))) {
        counts.skipped++
        console.log(`  already done  ${name}`)
        continue
      }
      counts.assets++
      console.log(`  ${APPLY ? "replaced" : "would replace"}  src/assets/${name} (${index[asset.id].files_kb[name]} KB)`)
      if (APPLY) {
        const file = `src/assets/${name}`
        if (!rollback.assets.some((a) => a.file === file)) rollback.assets.push({ slot: asset.id, file, gitCommit, at: new Date().toISOString() })
        saveRollback()
        copyFileSync(from, to)
      }
    }
  }

  console.log(`\n[replace] ${mode} summary: ${counts.uploads} upload(s), ${counts.rows} row update(s), ${counts.assets} asset file(s), ${counts.skipped} already done.`)
  if (!APPLY) console.log("[replace] Nothing was written. Re-run with --apply to perform these changes.")
}

;(ROLLBACK ? runRollback() : run()).catch((e) => {
  console.error(`[replace] FAILED: ${e.message}`)
  process.exit(1)
})

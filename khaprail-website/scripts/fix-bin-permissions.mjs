import { chmodSync, existsSync, globSync } from "node:fs"

// Hostinger's git-based build pipeline (hbuilds) was observed stripping the
// executable bit off native binaries under node_modules after `npm install`
// (confirmed live: node_modules/@esbuild/linux-x64/bin/esbuild came back
// `-rw-r--r--`, which broke tsx's esbuild-based transform with
// `EACCES: spawn ... esbuild`). Re-asserts +x on esbuild's native binary
// after every install so this self-heals regardless of platform quirks,
// instead of needing a manual `chmod +x` over SSH on every deploy.
const candidates = globSync("node_modules/@esbuild/*/bin/esbuild")

for (const path of candidates) {
  if (!existsSync(path)) continue
  try {
    chmodSync(path, 0o755)
    console.log(`[fix-bin-permissions] chmod +x ${path}`)
  } catch {
    // Non-fatal — e.g. no @esbuild binary installed for this platform.
  }
}

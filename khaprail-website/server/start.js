// Plain-JS bootstrap entry point for host panels that launch the app with a
// bare `node <file>` (e.g. Hostinger hPanel's Node.js "Application startup
// file", which does not run `npm start`/`tsx` for you). server/index.ts is
// real TypeScript — plain `node` can't parse it — so this file registers
// tsx's loader in-process and then imports the actual server. Point the
// host's "Application startup file" setting at this file, not at
// server/index.ts directly.
import { chmodSync, existsSync, readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

// Hostinger's build pipeline resets file modes AFTER `npm install` finishes,
// so the executable bit that scripts/fix-bin-permissions.mjs sets during
// postinstall is gone again by the time the app launches. tsx transpiles
// server/index.ts through esbuild's native binary, which then fails to spawn
// with EACCES and the app never starts (the host just shows a 503, and rolls
// the deploy back). Re-assert the bit here, at launch, in the directory the
// app is actually running from — nothing later in the pipeline can undo it.
function healEsbuildPermissions() {
  const scope = join(dirname(fileURLToPath(import.meta.url)), "..", "node_modules", "@esbuild")
  try {
    for (const pkg of readdirSync(scope)) {
      const bin = join(scope, pkg, "bin", "esbuild")
      if (existsSync(bin)) chmodSync(bin, 0o755)
    }
  } catch {
    // Non-fatal — no @esbuild scope installed, or the file is not ours to chmod.
  }
}

// Wrapped in an async IIFE (not a bare top-level await) so this module
// finishes synchronous evaluation immediately: Hostinger's LiteSpeed
// `lsnode.js` launches the entry file via CommonJS `require()`, which
// cannot load an ESM graph that has a top-level await
// (ERR_REQUIRE_ASYNC_MODULE) — only import() can. The IIFE keeps the
// import async internally while making the module itself synchronous.
// tsx is imported dynamically so the permission fix above is guaranteed to
// run before anything can spawn esbuild.
;(async () => {
  healEsbuildPermissions()
  const { register } = await import("tsx/esm/api")
  register()
  await import("./index.ts")
})()

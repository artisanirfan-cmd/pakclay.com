// Plain-JS bootstrap entry point for host panels that launch the app with a
// bare `node <file>` (e.g. Hostinger hPanel's Node.js "Application startup
// file", which does not run `npm start`/`tsx` for you). server/index.ts is
// real TypeScript — plain `node` can't parse it — so this file registers
// tsx's loader in-process (Node 20.6+ `module.register` API) and then
// imports the actual server. Point the host's "Application startup file"
// setting at this file, not at server/index.ts directly.
import { register } from "tsx/esm/api"

register()

// Wrapped in an async IIFE (not a bare top-level await) so this module
// finishes synchronous evaluation immediately: Hostinger's LiteSpeed
// `lsnode.js` launches the entry file via CommonJS `require()`, which
// cannot load an ESM graph that has a top-level await
// (ERR_REQUIRE_ASYNC_MODULE) — only import() can. The IIFE keeps the
// import async internally while making the module itself synchronous.
;(async () => {
  await import("./index.ts")
})()

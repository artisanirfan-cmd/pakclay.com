import type { Request as ExpressRequest, Response as ExpressResponse } from "express"

// The AI routes were originally written as Vercel Functions using the Web
// Fetch API handler signature (`Request` in, `Response` out) — see
// server/routes/ai-chat.ts's header note. Rather than rewrite that logic
// against Express's req/res shape (and risk changing behavior in the
// process), these two helpers translate between Express and the Fetch API
// at the edges, so the ported handler bodies stay byte-for-byte the same
// as the original Vercel functions.

/**
 * Builds a standard Fetch `Request` from an Express request whose raw body
 * was buffered by `express.raw()` (not `express.json()` — the ported
 * handlers call `request.json()` themselves and handle parse failures with
 * their own `invalid_json` response, which a body-parsing middleware would
 * otherwise short-circuit).
 */
export function toFetchRequest(req: ExpressRequest): Request {
  const url = `${req.protocol}://${req.get("host") ?? "localhost"}${req.originalUrl}`
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue
    headers.set(key, Array.isArray(value) ? value.join(", ") : value)
  }

  const hasBody = req.method !== "GET" && req.method !== "HEAD"
  const rawBody = req.body
  const body: Uint8Array | undefined =
    hasBody && Buffer.isBuffer(rawBody) && rawBody.length > 0 ? new Uint8Array(rawBody) : undefined

  return new Request(url, {
    method: req.method,
    headers,
    body: body as BodyInit | undefined,
  })
}

/** Streams a Fetch `Response` (including a streamed body) back through Express. */
export async function sendFetchResponse(fetchRes: Response, res: ExpressResponse): Promise<void> {
  res.status(fetchRes.status)
  fetchRes.headers.forEach((value, key) => {
    // Node sets its own transfer-encoding/connection headers for a streamed write.
    if (key.toLowerCase() === "transfer-encoding" || key.toLowerCase() === "connection") return
    res.setHeader(key, value)
  })

  if (!fetchRes.body) {
    res.end()
    return
  }

  const reader = fetchRes.body.getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(value)
    }
  } finally {
    res.end()
  }
}

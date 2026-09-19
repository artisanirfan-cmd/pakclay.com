import type { NextFunction, Request, Response } from "express"
import { getSiteUrl } from "./site.js"

// One canonical host, one canonical scheme.
//
//  * www.<domain> answered 200 with the full site (a second, duplicate copy of
//    every page). It now 301s to the canonical origin, keeping path + query.
//  * http -> https is normally done at Hostinger's edge; if a request still
//    arrives here as plain http (X-Forwarded-Proto: http) on the canonical
//    host it is redirected too. No header (local dev, direct probes) = no
//    redirect, so it can never loop or break local testing.
//  * Any OTHER host that reaches the app (Hostinger's temporary
//    *.hostingersite.com preview domains, the server IP) serves the same
//    pages, so those responses are marked `noindex` — their canonical tags
//    already point at the real domain — but are NOT redirected: localhost,
//    health probes and deploy checks must keep working untouched.
//
// /health is registered before this middleware in index.ts.

function stripPort(host: string): string {
  return host.toLowerCase().replace(/:\d+$/, "")
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"])

export function canonicalHostMiddleware(req: Request, res: Response, next: NextFunction): void {
  const site = new URL(getSiteUrl())
  const canonicalHost = site.hostname.replace(/^www\./, "")
  const host = stripPort(req.get("host") ?? "")

  if (host === `www.${canonicalHost}`) {
    res.redirect(301, `${site.protocol}//${site.host}${req.originalUrl}`)
    return
  }

  if (host === canonicalHost) {
    if (site.protocol === "https:" && req.get("x-forwarded-proto") === "http") {
      res.redirect(301, `https://${site.host}${req.originalUrl}`)
      return
    }
    next()
    return
  }

  if (host && !LOCAL_HOSTS.has(host) && !/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    res.set("X-Robots-Tag", "noindex, nofollow")
  }
  next()
}

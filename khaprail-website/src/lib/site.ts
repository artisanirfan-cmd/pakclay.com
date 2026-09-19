// Site identity constants shared by the head manager and structured data.
// SITE_URL is the public origin used in canonical URLs, og:url and JSON-LD;
// set VITE_SITE_URL at build time to change it (same variable the prerender
// script and the server read). Default: the live domain.
export const SITE_URL = ((import.meta.env.VITE_SITE_URL as string | undefined) || "https://pakclay.com").replace(/\/+$/, "")
export const SITE_NAME = "PAKCLAY.COM"

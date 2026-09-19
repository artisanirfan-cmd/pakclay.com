// Rewrites a Supabase Storage public-object URL into its on-the-fly image
// transformation equivalent (Storage's `/render/image/public/...` endpoint —
// confirmed enabled on this project: a 2.2MB source PNG transforms down to
// ~40KB at width=400/quality=75/format=webp with zero re-upload needed).
// SEO/perf batch A (2026-09-10, see 00-PROGRESS.md) — every admin-uploaded
// content photo (categories, products, trending tiles, offers, lifestyle
// tiles, blog covers) is a plain pasted Storage URL with no size/format
// control, and several are multi-MB unoptimized PNGs/JPEGs serving into a
// ~200-400px slot. This is the general-purpose fix: it applies to every
// current and future Storage image automatically, not just the ones this
// batch happened to find.
const STORAGE_OBJECT_PATH = "/storage/v1/object/public/"
const STORAGE_RENDER_PATH = "/storage/v1/render/image/public/"

export function isSupabaseStorageUrl(url: string): boolean {
  return url.includes(STORAGE_OBJECT_PATH)
}

export interface ImageTransformOptions {
  /** Target display width in CSS px — pass the actual rendered slot size, not the source's. */
  width: number
  height?: number
  /** When true, `width`/`height` are the exact PIXEL size to request (no 2x retina doubling) — used to build `srcset` candidates. */
  exactPixels?: boolean
  /** 20-100, defaults to 75 (Supabase's own recommended default — visually lossless for photos at this size). */
  quality?: number
  /** "cover" (default) matches this site's near-universal `object-cover` usage. */
  resize?: "cover" | "contain" | "fill"
  format?: "webp"
}

/** Caller should check `isSupabaseStorageUrl(url)` first — non-Storage URLs (local bundled assets, external links) are returned unchanged. */
export function transformStorageImage(url: string, options: ImageTransformOptions): string {
  if (!isSupabaseStorageUrl(url)) return url
  const rendered = url.replace(STORAGE_OBJECT_PATH, STORAGE_RENDER_PATH)
  const params = new URLSearchParams()
  // Requests slightly above the CSS display size (2x) so the image still
  // reads sharply on high-DPI ("Retina") phone/laptop screens.
  const scale = options.exactPixels ? 1 : 2
  params.set("width", String(Math.round(options.width * scale)))
  if (options.height) params.set("height", String(Math.round(options.height * scale)))
  params.set("quality", String(options.quality ?? 75))
  params.set("resize", options.resize ?? "cover")
  if (options.format) params.set("format", options.format)
  return `${rendered}?${params.toString()}`
}

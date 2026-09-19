import { isSupabaseStorageUrl, transformStorageImage } from "@/lib/image-transform"
import { SITE_URL } from "@/lib/site"

/** Absolute URL for a page image used in og:image / twitter:image / JSON-LD. */
export function absoluteUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`
}

/** A share-sized (1200 wide) version of a Supabase Storage photo; other URLs are made absolute unchanged. */
export function shareImage(url: string | null | undefined, height = 630): string | null {
  if (!url) return null
  if (isSupabaseStorageUrl(url)) {
    return transformStorageImage(url, { width: 1200, height, quality: 80, resize: "cover", exactPixels: true })
  }
  return absoluteUrl(url)
}

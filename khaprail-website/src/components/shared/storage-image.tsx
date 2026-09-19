import type { CSSProperties } from "react"
import { isSupabaseStorageUrl, transformStorageImage } from "@/lib/image-transform"

interface StorageImageProps {
  src: string
  alt: string
  /** Rendered CSS width/height (the actual display slot, not the source file's dimensions) — used both for the transform request size and the `<img>`'s own `width`/`height` attributes (layout-shift prevention). */
  width: number
  height: number
  className?: string
  style?: CSSProperties
  quality?: number
  resize?: "cover" | "contain" | "fill"
  /** Above-the-fold / LCP-candidate image — loads eagerly with a high fetch priority instead of the lazy-loaded default. */
  priority?: boolean
  /**
   * Offer several PIXEL widths as a `srcset` (e.g. `[480, 800, 1200]`) so a phone downloads a
   * phone-sized file instead of the desktop one. Requires `sizes`. Height of each candidate
   * follows the `width`:`height` aspect ratio. Without this prop the single 2x-retina request
   * (`width * 2`) is used, as before.
   */
  widths?: number[]
  /** The `sizes` attribute describing the rendered slot width — required when `widths` is set. */
  sizes?: string
}

/**
 * `<picture>` wrapper around a Supabase Storage-hosted image: a WebP
 * `<source>` plus a same-size/quality original-format `<img>` fallback, both
 * via Storage's image transformation endpoint (`lib/image-transform.ts`) —
 * real format/size optimization, not just a `loading="lazy"` attribute.
 * Non-Storage URLs (local bundled assets, external links) render as a plain
 * `<img>` unchanged, since there's nothing to transform.
 */
export function StorageImage({
  src,
  alt,
  width,
  height,
  className,
  style,
  quality,
  resize = "cover",
  priority = false,
  widths,
  sizes,
}: StorageImageProps) {
  const canTransform = isSupabaseStorageUrl(src)
  const responsive = canTransform && widths && widths.length > 0 && sizes
  const candidates = (format?: "webp") =>
    (widths ?? [])
      .map(
        (w) =>
          `${transformStorageImage(src, { width: w, height: Math.round((w * height) / width), quality, resize, format, exactPixels: true })} ${w}w`,
      )
      .join(", ")
  const webpSrc = canTransform ? transformStorageImage(src, { width, height, quality, resize, format: "webp" }) : null
  const fallbackSrc = canTransform ? transformStorageImage(src, { width, height, quality, resize }) : src

  return (
    <picture>
      {webpSrc && (
        <source
          srcSet={responsive ? candidates("webp") : webpSrc}
          sizes={responsive ? sizes : undefined}
          type="image/webp"
        />
      )}
      <img
        src={fallbackSrc}
        srcSet={responsive ? candidates() : undefined}
        sizes={responsive ? sizes : undefined}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : undefined}
        className={className}
        style={style}
      />
    </picture>
  )
}

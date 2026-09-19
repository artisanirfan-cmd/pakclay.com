import { lazy, Suspense, type ComponentType } from "react"
import type { LightboxExternalProps, Slide, ViewCallbackProps } from "yet-another-react-lightbox"
// Type-only import: pulls in the Zoom plugin's `declare module` augmentation
// (adds the `zoom` prop to LightboxProps) without affecting the runtime
// bundle — the actual plugin code is still loaded dynamically below.
import type {} from "yet-another-react-lightbox/plugins/zoom"
import { isSupabaseStorageUrl, transformStorageImage } from "@/lib/image-transform"

export interface ProductLightboxProps {
  open: boolean
  onClose: () => void
  images: string[]
  index: number
  onIndexChange?: (index: number) => void
  productName: string
}

// Full-screen slides get real, descriptive alt text — unlike the rest of
// the site's `alt=""` convention for inline thumbnails (SEO/perf batch A),
// this is the actual content someone opened the lightbox to look at.
function buildSlides(images: string[], productName: string): Slide[] {
  return images.map((url, i) => ({
    src: isSupabaseStorageUrl(url) ? transformStorageImage(url, { width: 1400, quality: 85 }) : url,
    alt: `${productName} — photo ${i + 1} of ${images.length}`,
  }))
}

// Both the lightbox core and its Zoom plugin (pinch/pan/double-tap/wheel
// zoom, swipe between slides, Escape-to-close + focus restore all built in)
// load on demand — this is an open-on-demand PDP feature, not something
// every page visit should pay bundle weight for.
const LazyLightbox = lazy(async () => {
  await import("yet-another-react-lightbox/styles.css")
  const [{ default: Lightbox }, { default: Zoom }] = await Promise.all([
    import("yet-another-react-lightbox"),
    import("yet-another-react-lightbox/plugins/zoom"),
  ])
  const WithZoom: ComponentType<LightboxExternalProps> = (props) => <Lightbox plugins={[Zoom]} {...props} />
  return { default: WithZoom }
})

/**
 * Full-screen zoomable gallery, opened from the PDP hero image
 * (`ZoomableHeroImage`). Includes every real image the product has
 * (`product.cover_image_url` + `product.product_images`), not just the one
 * that was tapped, so a multi-photo product can be swiped through here even
 * though the inline PDP gallery only ever surfaces a single swap thumbnail.
 */
export function ProductLightbox({ open, onClose, images, index, onIndexChange, productName }: ProductLightboxProps) {
  // Never mount (or fetch the lazy JS chunk) until the visitor actually opens it.
  if (!open) return null

  return (
    <Suspense fallback={null}>
      <LazyLightbox
        open={open}
        close={onClose}
        index={index}
        slides={buildSlides(images, productName)}
        on={{ view: ({ index: i }: ViewCallbackProps) => onIndexChange?.(i) }}
        zoom={{ maxZoomPixelRatio: 3, zoomInMultiplier: 2 }}
        carousel={{ finite: images.length <= 1 }}
        styles={{ container: { backgroundColor: "rgba(15, 23, 42, 0.95)" } }}
      />
    </Suspense>
  )
}

/** Fire-and-forget prefetch of the lightbox's lazy chunk, called on pointerdown
 *  (before the click registers) so opening it on tap/click feels instant. */
export function prefetchProductLightbox(): void {
  void import("yet-another-react-lightbox")
  void import("yet-another-react-lightbox/plugins/zoom")
}

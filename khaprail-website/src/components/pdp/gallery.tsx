import { useState } from "react"
import { StorageImage } from "@/components/shared/storage-image"
import { ZoomableHeroImage } from "./zoomable-hero-image"
import { ProductLightbox } from "./product-lightbox"

interface GalleryProps {
  productName: string
  coverImageUrl: string | null
  productImages: { image_url: string }[]
}

function dedupeImages(coverImageUrl: string | null, productImages: { image_url: string }[]): string[] {
  const urls = [coverImageUrl, ...productImages.map((img) => img.image_url)].filter(
    (url): url is string => !!url
  )
  return Array.from(new Set(urls))
}

// Single main photo + one small thumbnail — that inline layout is unchanged
// here (a prior batch-6 code comment claimed 05-PDP-SPEC.md called for "not
// a full zoom gallery," but the actual spec (line 7) always asked for
// "roll-over/click zoom" on the hero image; that comment misattributed the
// batch-11 removal of the separate color-swatch/variant feature to zoom as
// well — corrected here, see 00-PROGRESS.md). What's new: the hero photo
// now hover-zooms on desktop and opens a full-screen lightbox
// (`ProductLightbox`) on click/tap — the lightbox includes every real image
// the product has (cover + all `product_images`), so a multi-photo product
// can be swiped through there even though only one thumbnail ever shows
// inline. The hero photo is a likely LCP element on PDPs, so it loads
// eagerly/high-priority (`priority`) rather than the lazy default every
// other image on the site uses (SEO/perf batch A, 2026-09-10).
export function Gallery({ productName, coverImageUrl, productImages }: GalleryProps) {
  const images = dedupeImages(coverImageUrl, productImages)
  const [thumbnailSwapped, setThumbnailSwapped] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const heroImageUrl = (thumbnailSwapped ? images[1] : images[0]) ?? images[0] ?? null
  const thumbnailImageUrl = images.length > 1 ? (thumbnailSwapped ? images[0] : images[1]) : null

  function openLightbox() {
    if (images.length === 0) return
    const startIndex = heroImageUrl ? Math.max(0, images.indexOf(heroImageUrl)) : 0
    setLightboxIndex(startIndex)
    setLightboxOpen(true)
  }

  function handleLightboxClose() {
    setLightboxOpen(false)
    // If the visitor swiped to the "other" of the two inline slots while
    // browsing full-screen, reflect that back into the simple hero/thumbnail
    // toggle so the inline gallery matches what they were last looking at.
    if (lightboxIndex === 0 || lightboxIndex === 1) {
      setThumbnailSwapped(lightboxIndex === 1)
    }
  }

  return (
    <div className="flex gap-3">
      <ZoomableHeroImage src={heroImageUrl} alt={productName} onOpenLightbox={openLightbox} />
      {thumbnailImageUrl && (
        <button
          type="button"
          onClick={() => setThumbnailSwapped((prev) => !prev)}
          aria-label={`Show the other photo of ${productName}`}
          className="flex size-20 shrink-0 items-center justify-center self-start overflow-hidden rounded-lg bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <StorageImage src={thumbnailImageUrl} alt="" width={80} height={80} className="h-full w-full object-cover" />
        </button>
      )}
      <ProductLightbox
        open={lightboxOpen}
        onClose={handleLightboxClose}
        images={images}
        index={lightboxIndex}
        onIndexChange={setLightboxIndex}
        productName={productName}
      />
    </div>
  )
}

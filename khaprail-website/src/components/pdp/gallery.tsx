import { useState } from "react"
import { StorageImage } from "@/components/shared/storage-image"
import { cn } from "@/lib/utils"
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

// PDP gallery (Option B redesign, 2026-11-05): one large photo with hover
// zoom + click-to-open lightbox, and a thumbnail strip under it listing every
// real photo the product has (previously only a single second thumbnail was
// shown). The hero photo is a likely LCP element, so it loads eagerly
// (`priority` inside ZoomableHeroImage). With a single photo no strip renders.
export function Gallery({ productName, coverImageUrl, productImages }: GalleryProps) {
  const images = dedupeImages(coverImageUrl, productImages)
  const [activeIndex, setActiveIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const heroImageUrl = images[activeIndex] ?? images[0] ?? null

  function openLightbox() {
    if (images.length === 0) return
    setLightboxIndex(Math.max(0, activeIndex))
    setLightboxOpen(true)
  }

  function handleLightboxClose() {
    setLightboxOpen(false)
    // Keep the inline photo in step with whatever the visitor last viewed full-screen.
    if (lightboxIndex >= 0 && lightboxIndex < images.length) setActiveIndex(lightboxIndex)
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <ZoomableHeroImage
        src={heroImageUrl}
        alt={productName}
        onOpenLightbox={openLightbox}
        className="aspect-[4/3] lg:aspect-[5/4]"
      />
      {images.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1" aria-label={`Photos of ${productName}`}>
          {images.map((url, index) => (
            <li key={url} className="shrink-0">
              <button
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Show photo ${index + 1} of ${images.length}`}
                aria-current={index === activeIndex}
                className={cn(
                  "block size-16 overflow-hidden rounded-xl bg-muted outline-none ring-2 ring-offset-2 ring-offset-background transition focus-visible:ring-ring sm:size-20",
                  index === activeIndex ? "ring-primary" : "ring-transparent hover:ring-border",
                )}
              >
                <StorageImage src={url} alt="" width={80} height={80} className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
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

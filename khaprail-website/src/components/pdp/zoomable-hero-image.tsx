import { useCallback, useRef, useState, type PointerEvent } from "react"
import { ZoomInIcon } from "lucide-react"
import { StorageImage } from "@/components/shared/storage-image"
import { prefetchProductLightbox } from "./product-lightbox"

// Enough to clearly show tile texture/grain without being disorienting.
const ZOOM_SCALE = 2.5

interface ZoomableHeroImageProps {
  src: string | null
  alt: string
  onOpenLightbox: () => void
}

/**
 * The PDP's main product photo. Desktop (mouse) hover zooms in on the area
 * under the cursor via a plain CSS `transform-origin`/`scale` — no extra
 * network request, no transition fighting the mousemove updates, so it
 * tracks the cursor instantly with no lag. Any pointer type can click/tap
 * to open the full-screen lightbox (`ProductLightbox`) for pinch-zoom/pan/
 * swipe-between-images. Scoped to the PDP hero only, per the task —
 * thumbnails elsewhere on the site are untouched.
 */
export function ZoomableHeroImage({ src, alt, onOpenLightbox }: ZoomableHeroImageProps) {
  const frameRef = useRef<number | null>(null)
  const [isZooming, setIsZooming] = useState(false)
  const [origin, setOrigin] = useState({ x: 50, y: 50 })

  const trackPointer = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100
    const clampedX = Math.min(100, Math.max(0, x))
    const clampedY = Math.min(100, Math.max(0, y))
    // Coalesce to one update per frame so a fast/high-poll-rate mouse can't
    // flood React with state updates and introduce jank on a slower laptop.
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    frameRef.current = requestAnimationFrame(() => setOrigin({ x: clampedX, y: clampedY }))
  }, [])

  function handlePointerEnter(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType !== "mouse") return
    trackPointer(event)
    setIsZooming(true)
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType !== "mouse") return
    trackPointer(event)
  }

  function handlePointerLeave() {
    setIsZooming(false)
  }

  return (
    <button
      type="button"
      onClick={onOpenLightbox}
      onPointerDown={prefetchProductLightbox}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      aria-label={src ? `View ${alt} full screen` : "Product photo"}
      className="group relative flex aspect-square w-full cursor-zoom-in items-center justify-center overflow-hidden rounded-xl bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {src && (
        <StorageImage
          src={src}
          alt={alt}
          width={900}
          height={900}
          // Phones download a ~720px file instead of the previous fixed
          // 1800px one (374 KiB); desktop keeps a 1100px candidate so the
          // 2.5x hover-zoom stays sharp. `sizes` describes the real slot
          // (single column on mobile, half of max-w-6xl on lg+).
          widths={[480, 720, 1100, 1400]}
          sizes="(min-width: 1024px) 1100px, calc(100vw - 32px)"
          priority
          className="h-full w-full object-cover"
          style={{
            transform: isZooming ? `scale(${ZOOM_SCALE})` : "scale(1)",
            transformOrigin: `${origin.x}% ${origin.y}%`,
          }}
        />
      )}
      <span className="pointer-events-none absolute right-3 bottom-3 flex size-9 items-center justify-center rounded-full bg-background/80 text-foreground opacity-100 shadow-sm transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
        <ZoomInIcon className="size-4" />
      </span>
    </button>
  )
}

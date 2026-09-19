import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { buildWhatsAppUrl } from "@/lib/whatsapp"
import { HERO_IMAGE_JPG, HERO_IMAGE_WEBP_SRCSET, HERO_IMAGE_WIDTH, HERO_IMAGE_HEIGHT } from "@/lib/hero-image"

// Light powder-blue banner — the one section that breaks from the dark
// storefront theme (2026-08-25 restyle), dark navy text, black pill CTA.
// Only one hero slide/data source exists, so no carousel arrows are shown
// rather than faking multi-slide controls.
export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <picture>
        <source srcSet={HERO_IMAGE_WEBP_SRCSET} sizes="100vw" type="image/webp" />
        {/* Confirmed via Lighthouse (SEO/perf batch A, 2026-09-10) as this
            page's LCP element — `fetchPriority="high"` tells the browser to
            prioritize this download the moment it's discovered, instead of
            competing with other requests at default priority. Already
            eager/not lazy-loaded (correct, it's above the fold). */}
        <img
          src={HERO_IMAGE_JPG}
          alt=""
          aria-hidden="true"
          width={HERO_IMAGE_WIDTH}
          height={HERO_IMAGE_HEIGHT}
          fetchPriority="high"
          className="absolute inset-0 -z-20 h-full w-full object-cover object-[center_25%]"
        />
      </picture>
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-hero/95 via-hero/85 to-hero/40" />

      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-4 px-4 py-14 text-center sm:px-6 lg:items-start lg:py-20 lg:text-left">
        <span className="rounded-full bg-hero-foreground/90 px-4 py-1 text-sm font-medium text-hero">
          Est. 1982 · Lahore, Pakistan
        </span>
        <h1 className="max-w-4xl font-heading text-5xl font-semibold leading-[1.1] text-hero-foreground sm:text-6xl lg:text-7xl">
          Clay Roof &amp; Terracotta Tiles, Shaped in Lahore Since 1982
        </h1>
        <p className="max-w-xl text-lg text-hero-foreground/85">
          Khaprail Tiles fires khaprail roof tiles, Multani tiles, and terracotta flooring from local clay —
          made for real Pakistani homes, not just a showroom.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            size="lg"
            className="h-14 rounded-full bg-hero-foreground px-7 text-lg text-hero hover:bg-hero-foreground/85"
            nativeButton={false}
            render={
              <a
                href={buildWhatsAppUrl("Hi, I'd like to request a free tile sample.")}
                target="_blank"
                rel="noreferrer"
              />
            }
          >
            Get a Sample
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-14 rounded-full border-hero-foreground/40 bg-transparent px-7 text-lg text-hero-foreground hover:bg-hero-foreground/10"
            nativeButton={false}
            render={<Link to="/downloads" />}
          >
            Download Catalog
          </Button>
        </div>
      </div>
    </section>
  )
}

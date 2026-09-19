import { Link } from "react-router-dom"
import {
  HERITAGE_IMAGE_JPG,
  HERITAGE_IMAGE_WEBP_SRCSET,
  HERITAGE_IMAGE_WIDTH,
  HERITAGE_IMAGE_HEIGHT,
} from "@/lib/heritage-image"

// Banner treatment reusing the Hero's exact visual pattern (background photo
// + gradient color wash + light pill badge + bold heading + subtext) rather
// than designing a new one — same `--hero`/`--hero-foreground` tokens as
// `hero.tsx`. Centered (not left-aligned like the Hero) since this is a
// shorter, mid-page brand-story band, not the page's primary banner. No CTA
// button — the Hero above already carries "Get a Sample"/"Download Catalog",
// so this only adds a low-emphasis text link to the fuller story on /about.
export function Heritage() {
  return (
    <section className="relative overflow-hidden">
      <picture>
        <source srcSet={HERITAGE_IMAGE_WEBP_SRCSET} sizes="100vw" type="image/webp" />
        <img
          src={HERITAGE_IMAGE_JPG}
          alt=""
          aria-hidden="true"
          width={HERITAGE_IMAGE_WIDTH}
          height={HERITAGE_IMAGE_HEIGHT}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 -z-20 h-full w-full object-cover"
        />
      </picture>
      <div className="absolute inset-0 -z-10 bg-hero/90" />

      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4 px-4 py-20 text-center sm:px-6">
        <span className="rounded-full bg-hero-foreground/90 px-4 py-1 text-sm font-medium text-hero">
          Our Heritage · Est. 1982
        </span>
        <h2 className="max-w-2xl font-heading text-5xl font-semibold leading-[1.1] text-hero-foreground sm:text-6xl">
          Est. 1982 — A Lahore Craft, Still Going
        </h2>
        <p className="max-w-xl text-xl text-hero-foreground/85">
          Khaprail Tiles has shaped clay roof tiles, Multani tiles, and terracotta flooring in Lahore since 1982.
          Every khaprail, disc, and Multani tile we fire uses the same craft the workshop was built on —
          made for real roofs and floors, not just a showroom shelf.
        </p>
        <Link
          to="/about"
          className="mt-2 text-sm font-medium text-hero-foreground underline-offset-4 hover:underline"
        >
          Learn Our Story
        </Link>
      </div>
    </section>
  )
}

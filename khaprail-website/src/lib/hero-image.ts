import hero640 from "@/assets/hero-640.webp"
import hero960 from "@/assets/hero-960.webp"
import hero1600 from "@/assets/hero-1600.webp"
import heroFallbackJpg from "@/assets/hero-1280.jpg"

// PLACEHOLDER — replace with real Khaprail product/roof photography.
// Source: "Ceramic Roof Tiles" by Thắng-Nhật Trần, Pexels (free license,
// no attribution required): https://www.pexels.com/photo/17680685/
//
// Responsive variants generated from the original 1600x1067 source (kept
// unchanged as `hero-placeholder.jpg`/`.webp`): a phone now downloads the
// ~139 KiB 960w WebP instead of the previous single 435 KiB file. The image
// sits under a 40-95% dark wash, so the lower WebP quality is not visible.
export const HERO_IMAGE_JPG = heroFallbackJpg
export const HERO_IMAGE_WEBP_SRCSET = `${hero640} 640w, ${hero960} 960w, ${hero1600} 1600w`
/**
 * `sizes` for the hero <source> AND the build-time preload (copied from the
 * markup by scripts/prerender.mjs). The hero is full-bleed but sits under a
 * 40-95% dark wash, so phones are told it renders at 66vw: a 412px/1.75x phone
 * takes the 79 KiB 640w file instead of the 139 KiB 960w one, while desktop
 * (>=1024px) still gets the full-width pick (960w/1600w).
 */
export const HERO_IMAGE_SIZES = "(min-width: 1024px) 100vw, 66vw"
/** Intrinsic size of every variant's aspect ratio (1600x1067) — for the <img> width/height attributes. */
export const HERO_IMAGE_WIDTH = 1600
export const HERO_IMAGE_HEIGHT = 1067

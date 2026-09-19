import heritage640 from "@/assets/heritage-640.webp"
import heritage960 from "@/assets/heritage-960.webp"
import heritage1600 from "@/assets/heritage-1600.webp"
import heritageFallbackJpg from "@/assets/heritage-1280.jpg"

// PLACEHOLDER — replace with real Khaprail workshop/tile-firing photography.
// Source: "Tiles on Roof" by Tom Van Dyck, Pexels (free license, no
// attribution required): https://www.pexels.com/photo/tiles-on-roof-15562216/
// Responsive variants of the original 1600x1067 source (kept unchanged as
// `heritage-placeholder.jpg`/`.webp`); see lib/hero-image.ts.
export const HERITAGE_IMAGE_JPG = heritageFallbackJpg
export const HERITAGE_IMAGE_WEBP_SRCSET = `${heritage640} 640w, ${heritage960} 960w, ${heritage1600} 1600w`
export const HERITAGE_IMAGE_WIDTH = 1600
export const HERITAGE_IMAGE_HEIGHT = 1067

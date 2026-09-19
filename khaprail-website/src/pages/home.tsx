import { useDocumentHead } from "@/hooks/use-document-head"
import { Hero } from "@/components/home/hero"
import { FeaturedCategoriesRow } from "@/components/home/featured-categories-row"
import { FeatureRow } from "@/components/home/feature-row"
import { OffersSection } from "@/components/home/offers-section"
import { BestSellersSection } from "@/components/home/best-sellers-section"
import { Heritage } from "@/components/home/heritage"
import { TrendingCategoriesGrid } from "@/components/home/trending-categories-grid"
import { CategoryShowcase } from "@/components/home/category-showcase"
import { LifestyleTilesSection } from "@/components/home/lifestyle-tiles-section"
import { ShopByCategorySection } from "@/components/home/shop-by-category-section"
import { TrendingTilesSection } from "@/components/home/trending-tiles-section"
import { NewArrivalsSection } from "@/components/home/new-arrivals-section"
import { VideosSection } from "@/components/home/videos-section"
import { DownloadCta } from "@/components/home/download-cta"

// Section order per 10-HOMEPAGE-SPEC.md: Hero -> Featured Categories ->
// 3-image feature row -> Best Sellers -> Trending/Categories grid ->
// New Arrivals -> Footer (rendered by SiteLayout, not here). Heritage
// ("Est. 1982 — A Lahore Craft, Still Going") was moved 2026-09-10 from
// its original spot (between Best Sellers and Trending Categories) to sit
// last, directly above the footer, per request — see 00-PROGRESS.md.
// Videos/Download CTA aren't in that target order but are kept (moved
// earlier) rather than deleted — both are real, already-built,
// honest-data-backed sections; see 00-PROGRESS.md for this adaptation.
// Category Showcase (warm-panel 3-photo section, distinct from the earlier
// 3-image feature row) was added after Trending Categories per its own
// request — see 00-PROGRESS.md. Shop by Category (tabbed category browser +
// product carousel) was added after Category Showcase for the same reason —
// neither is in the spec's confirmed order, but both are real, data-driven
// additions rather than one-off requests to delete. Lifestyle Tiles ("Tiles
// for Every Space") was added after Category Showcase for the same
// reason — an admin-curated editorial alternative that does the same
// "browse by space" job differently, kept alongside Category Showcase
// rather than replacing it, per request. Offers ("Offers, Available Now")
// was added after Featured Categories, near the top — real always-true
// capabilities (free samples/bulk pricing/delivery/new-customer welcome),
// never a percentage-off discount, since no live promotion is confirmed;
// fully admin-editable so real terms can replace the placeholder wording
// later with no code change — see 00-PROGRESS.md. Trending in Tiles (fixed
// 4-slot bento grid) was added after Shop by Category for the same
// reason — a new, admin-curated section, not in the spec's confirmed
// order, kept alongside everything else rather than replacing it.
export function Home() {
  useDocumentHead({
    title: "Clay Roof & Terracotta Tiles in Lahore | PAKCLAY.COM",
    fullTitle: true,
    description:
      "Khaprail Tiles has made clay roof tiles, Multani tiles and terracotta flooring in Lahore since 1982. Browse the range and request a free sample.",
    path: "/",
  })
  return (
    <main className="flex-1">
      <Hero />
      <FeaturedCategoriesRow />
      <OffersSection />
      <FeatureRow />
      <BestSellersSection />
      <TrendingCategoriesGrid />
      <CategoryShowcase />
      <LifestyleTilesSection />
      <ShopByCategorySection />
      <TrendingTilesSection />
      <NewArrivalsSection />
      <VideosSection />
      <DownloadCta />
      <Heritage />
    </main>
  )
}

import { Link } from "react-router-dom"
import { Skeleton } from "@/components/ui/skeleton"
import { StorageImage } from "@/components/shared/storage-image"
import { useTrendingTiles } from "@/hooks/use-trending-tiles"
import { useCategoryLinkResolver } from "@/hooks/use-category-link-resolver"
import { cn } from "@/lib/utils"
import type { TrendingTile } from "@/types/trending-tile"

// "Trending in Tiles" — a fixed 4-slot bento grid (large left / two small
// top-right / wide bottom-right), admin-curated via `trending_tiles`
// (grid_position/title/subtitle/image/link/is_active/show_new_badge). Only
// renders the full bento shape when all 4 canonical slots have an active
// tile; otherwise falls back to a simple wrapped grid of whatever tiles
// exist, per the "never leave an empty grid cell or a broken layout"
// requirement — a partial admin setup should never look broken.
// No `grid-rows-*` utility on the bento grid — rows must size to their own
// content (small tiles' aspect-[4/3], the wide tile's aspect-[2/1])
// independently; an explicit `grid-rows-2` forces two equal 1fr rows,
// which stretches the shorter row to match the taller one and leaves a
// visible gap under the small tiles. The `large` tile (row-span-2,
// aspect-auto at lg) stretches across the combined natural height of
// both rows via the grid's default `align-items: stretch`.
export function TrendingTilesSection() {
  const { tiles: rawTiles, isLoading, error } = useTrendingTiles()
  const resolveLink = useCategoryLinkResolver()
  // Admin-entered links are cleaned: normalised to absolute paths, and kept off empty categories.
  const tiles = rawTiles.map((tile) => ({ ...tile, link_url: resolveLink(tile.link_url) }))

  if (error || (!isLoading && tiles.length === 0)) return null

  const isFullBento = tiles.length === 4

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <h2 className="mb-8 text-center font-heading text-4xl font-semibold text-foreground sm:text-5xl">
        Trending in Tiles
      </h2>
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Skeleton className="aspect-square w-full rounded-2xl lg:col-span-1 lg:row-span-2 lg:aspect-auto" />
          <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
          <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
          <Skeleton className="aspect-[2/1] w-full rounded-2xl lg:col-span-2" />
        </div>
      ) : isFullBento ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {tiles.map((tile) => (
            <TrendingTileCard
              key={tile.id}
              tile={tile}
              className={cn(
                tile.grid_position === "large" && "aspect-[4/3] lg:col-span-1 lg:row-span-2 lg:aspect-auto",
                (tile.grid_position === "small_top_left" || tile.grid_position === "small_top_right") &&
                  "aspect-[4/3]",
                tile.grid_position === "wide_bottom" && "aspect-[2/1] lg:col-span-2"
              )}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {tiles.map((tile) => (
            <TrendingTileCard key={tile.id} tile={tile} className="aspect-[4/3]" />
          ))}
        </div>
      )}
    </section>
  )
}

function TrendingTileCard({ tile, className }: { tile: TrendingTile; className?: string }) {
  return (
    <Link
      to={tile.link_url}
      className={cn(
        "group relative block overflow-hidden rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className
      )}
    >
      {/* Real WebP/quality/size optimization via Supabase's transform
          endpoint (SEO/perf batch A, 2026-09-10). Position-absolute fill, so
          width/height only inform the transform request size — the visible
          box is entirely CSS-driven (h-full w-full) and already sized by
          the parent's aspect-ratio className, no CLS risk either way. */}
      <StorageImage
        src={tile.image_url}
        alt={tile.image_alt_text}
        width={600}
        height={450}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      {tile.show_new_badge && (
        // Same "NEW" badge as the product card and Trending Categories:
        // the light-blue accent badge pair (--badge-accent /
        // --badge-accent-foreground, 6.29:1) from the PAKCLAY.COM palette,
        // so it reads as one consistent badge style (UX_AUDIT_REPORT.md
        // finding 6 / 1.5).
        <span className="absolute top-3 left-3 z-10 rounded-full bg-badge-accent px-3 py-1 text-xs font-semibold text-badge-accent-foreground">
          NEW
        </span>
      )}
      <div className="absolute inset-x-0 bottom-0 z-10 bg-navy/80 px-4 py-3">
        <p className="font-heading text-lg font-bold text-navy-foreground">{tile.title}</p>
        <p className="text-sm text-navy-foreground/80">{tile.subtitle}</p>
      </div>
    </Link>
  )
}

import { Link } from "react-router-dom"
import { Skeleton } from "@/components/ui/skeleton"
import { StorageImage } from "@/components/shared/storage-image"
import { useLifestyleTiles } from "@/hooks/use-lifestyle-tiles"
import { useCategoryLinkResolver } from "@/hooks/use-category-link-resolver"
import { cn } from "@/lib/utils"

const SKELETON_COUNT = 3

// Column count matches however many active tiles exist (2 tiles -> 2
// columns, 1 -> 1 column) rather than always reserving 3 slots, so a
// partially-filled admin list never leaves an empty gap in the grid. Caps
// at 3 columns even if more than 3 tiles are ever added (wraps to a second
// row) since the design target is exactly 3.
const GRID_COLS: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
}

// "Tiles for Every Space" — admin-curated editorial photo tiles
// (`lifestyle_tiles`, hand-entered caption/link/image per row), distinct
// from the data-driven "Explore Our Range" (`CategoryShowcase`, picked by
// real product count) — same "browse by space" job, different curation
// model, so both coexist rather than one replacing the other. Heading sits
// above the framed panel (not inside it, unlike Category Showcase) and
// tiles use a 4:5 portrait ratio + a muted panel tone, so the two don't
// read as the same section repeated.
export function LifestyleTilesSection() {
  const { tiles: rawTiles, isLoading, error } = useLifestyleTiles()
  const resolveLink = useCategoryLinkResolver()
  // Admin-entered links are cleaned: normalised to absolute paths, and kept off empty categories.
  const tiles = rawTiles.map((tile) => ({ ...tile, link_url: resolveLink(tile.link_url) }))

  if (error || (!isLoading && tiles.length === 0)) return null

  const columnsClass = GRID_COLS[Math.min(tiles.length, 3)] ?? GRID_COLS[3]

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <h2 className="mb-8 text-center font-heading text-4xl font-semibold text-foreground sm:text-5xl">
        Tiles for Every Space
      </h2>
      <div className="rounded-2xl bg-muted p-6 sm:p-10">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-3">
                <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
                <Skeleton className="h-5 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className={cn("grid grid-cols-1 gap-6", columnsClass)}>
            {tiles.map((tile) => (
              <Link
                key={tile.id}
                to={tile.link_url}
                className="group flex flex-col items-center gap-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <div className="aspect-[4/5] w-full overflow-hidden rounded-2xl">
                  <StorageImage
                    src={tile.image_url}
                    alt={tile.image_alt_text}
                    width={380}
                    height={475}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <span className="text-lg font-bold text-foreground">{tile.caption}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

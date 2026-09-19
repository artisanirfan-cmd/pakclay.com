import { createElement } from "react"
import { getCategoryIcon } from "@/lib/category-icons"
import { StorageImage } from "@/components/shared/storage-image"
import { cn } from "@/lib/utils"
import type { Category } from "@/types/category"

interface CategoryTileProps {
  category: Category
  compact?: boolean
}

/**
 * Visual body of a category card (image + label) with no link semantics of
 * its own — callers (mega-menu, homepage grid) supply the interactive
 * wrapper so this stays reusable in both a NavigationMenuLink and a plain
 * router Link.
 */
export function CategoryTile({ category, compact }: CategoryTileProps) {
  return (
    <>
      <span
        className={cn(
          "flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-md bg-muted shadow-sm transition-transform duration-200 ease-out hover:scale-[1.04] group-focus-visible/card:ring-3 group-focus-visible/card:ring-ring/50 group-hover/card:shadow-md",
          compact && "aspect-square"
        )}
      >
        {category.cover_image_url ? (
          // Real WebP/quality/size optimization via Supabase's image
          // transform endpoint (SEO/perf batch A, 2026-09-10) — several live
          // category photos are 2MB+ unoptimized PNGs (UX_AUDIT_REPORT.md
          // finding 11); `StorageImage` requests an already-small version
          // instead of shipping the full source file into a ~200-320px slot.
          <StorageImage
            src={category.cover_image_url}
            alt=""
            width={compact ? 200 : 320}
            height={compact ? 200 : 200}
            className="h-full w-full object-cover"
          />
        ) : (
          // No blank box while no real photo exists yet (26/29 live
          // categories) — falls back to the same icon system
          // `CategoryBadgeCircle` uses elsewhere (UX_AUDIT_REPORT.md
          // finding 8 / 1.1). createElement, not JSX, so a runtime-resolved
          // icon component doesn't trip oxlint's static-components heuristic.
          createElement(getCategoryIcon(category.name), {
            className: cn("text-muted-foreground", compact ? "size-8" : "size-10"),
            strokeWidth: 1.5,
            "aria-hidden": "true",
          })
        )}
      </span>
      <span className={cn("font-medium text-foreground", compact ? "text-sm" : "text-base")}>
        {category.name}
      </span>
    </>
  )
}

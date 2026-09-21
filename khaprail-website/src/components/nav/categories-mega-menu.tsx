import { useRef } from "react"
import {
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { CategoryCard } from "@/components/nav/category-card"
import { getRootCategories } from "@/lib/category-tree"
import type { Category } from "@/types/category"

interface CategoriesMegaMenuProps {
  categories: Category[]
  isLoading: boolean
  error: string | null
  triggerClassName?: string
}

/**
 * "Categories" image-card dropdown (03-MEGA-MENU-SPEC.md), now sourced from
 * the 12-CATEGORY-TAXONOMY.md `categories` table. Arrow keys roam the whole
 * card set via a roving tabindex-style focus move; Enter/click follow the
 * card's link; Escape-to-close and focus-return-to-trigger are handled by
 * the NavigationMenu primitive itself.
 */
export function CategoriesMegaMenu({ categories, isLoading, error, triggerClassName }: CategoriesMegaMenuProps) {
  const cardRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const roots = getRootCategories(categories)

  function handleKeyDown(event: React.KeyboardEvent, index: number) {
    let nextIndex: number | null = null
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (index + 1) % roots.length
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (index - 1 + roots.length) % roots.length
    }
    if (nextIndex !== null) {
      event.preventDefault()
      cardRefs.current[nextIndex]?.focus()
    }
  }

  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger className={triggerClassName}>Categories</NavigationMenuTrigger>
      <NavigationMenuContent>
        {/* Width never exceeds the viewport minus the positioner's 16px
            gutters; height is capped below the two-bar header (its bottom edge
            is at ~147px incl. the 8px offset, plus the popup's own padding) so a full 15-category grid scrolls inside the panel on
            short windows instead of running off the bottom of the screen. */}
        <div className="max-h-[calc(100svh-11rem)] w-[min(54rem,calc(100vw-2rem))] overflow-y-auto p-6">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <Skeleton className="aspect-[16/10] w-full rounded-md" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          ) : error || roots.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Categories coming soon.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {roots.map((category, index) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  cardRef={(el) => {
                    cardRefs.current[index] = el
                  }}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                />
              ))}
            </div>
          )}
        </div>
      </NavigationMenuContent>
    </NavigationMenuItem>
  )
}

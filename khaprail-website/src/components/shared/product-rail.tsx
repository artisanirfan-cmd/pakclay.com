import { useRef, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ProductCard } from "@/components/products/product-card"
import { cn } from "@/lib/utils"
import type { Product } from "@/types/product"

interface ProductRailProps {
  /** Omit when the section renders its own heading elsewhere (e.g. a heading + tabs combo above this rail). */
  title?: string
  emptyCopy: string
  viewAllTo?: string
  products: Product[]
  isLoading: boolean
  error?: string | null
  /** Return null (render nothing) instead of the empty-state copy when there's no real data yet. */
  hideWhenEmpty?: boolean
  /**
   * Minimum product count to render the carousel at all (default 1, i.e. any
   * real data). Raise this for sections like "Top Picks Today" where a
   * near-empty carousel (1-2 cards) looks broken rather than honest — falls
   * back to `emptyCopy`/hiding just like having zero products.
   */
  minCount?: number
  /** Alternating dark panel tone the rail sits in (2026-08-25 restyle) — "none" leaves the page background showing through. */
  tone?: "navy" | "warm" | "none"
  /** Title alignment — "center" for panels like Best Sellers that put the tab row underneath (default "left"). */
  align?: "left" | "center"
  /** Optional row rendered directly under the title (e.g. Best Sellers' category tabs) — opt-in per usage, not part of the shared header layout otherwise. */
  tabs?: ReactNode
  /** Hide the left/right scroll-arrow buttons — for sections like Shop by Category where the arrows sit right next to a tab row and read as if they belonged to the tabs. The card row itself stays scrollable via touch/trackpad/keyboard. */
  hideArrows?: boolean
}

const SKELETON_COUNT = 4

const TONE_CLASSES: Record<NonNullable<ProductRailProps["tone"]>, string> = {
  navy: "rounded-2xl bg-panel-navy p-6 sm:p-8",
  warm: "rounded-2xl bg-panel-warm p-6 sm:p-8",
  none: "",
}

// Circular orange nav arrows on a colored panel (per the Top Picks Today
// reference); plain outline arrows when the rail sits directly on the page
// background instead.
const ARROW_CLASSES: Record<NonNullable<ProductRailProps["tone"]>, string> = {
  navy: "rounded-full border-transparent bg-accent text-accent-foreground hover:bg-primary-dark",
  warm: "rounded-full border-transparent bg-accent text-accent-foreground hover:bg-primary-dark",
  none: "",
}

// Shared horizontal-scroll product carousel — Best Sellers, New Arrivals,
// Top Picks Today, Similar Products, Explore More Products all use this so
// the "real data or an honest empty state, never fabricated" pattern only
// lives in one place (02-DESIGN-SYSTEM.md). Sits inside a slightly lighter
// dark panel per the 2026-08-25 restyle, alternating tone between sections
// for visual rhythm.
export function ProductRail({
  title,
  emptyCopy,
  viewAllTo,
  products,
  isLoading,
  error,
  hideWhenEmpty,
  minCount = 1,
  tone = "none",
  align = "left",
  tabs,
  hideArrows,
}: ProductRailProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const hasProducts = !isLoading && !error && products.length >= minCount

  if (!isLoading && !hasProducts && hideWhenEmpty) return null

  function scrollBy(amount: number) {
    scrollRef.current?.scrollBy({ left: amount, behavior: "smooth" })
  }

  return (
    <section className={cn(TONE_CLASSES[tone])}>
      <div className={cn("mb-6 flex items-start justify-between gap-4", align === "center" && "relative")}>
        <div className={cn("flex flex-1 flex-col gap-4", align === "center" && "items-center text-center")}>
          {title && <h2 className="font-heading text-4xl font-semibold text-foreground sm:text-5xl">{title}</h2>}
          {tabs}
        </div>
        <div className={cn("flex items-center gap-2", align === "center" && "absolute top-0 right-0")}>
          {hasProducts && viewAllTo && (
            <Link to={viewAllTo} className="text-sm font-medium text-primary hover:underline">
              View All
            </Link>
          )}
          {hasProducts && !hideArrows && (
            <div className="hidden gap-1 sm:flex">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className={cn("size-8", ARROW_CLASSES[tone])}
                onClick={() => scrollBy(-320)}
              >
                <ChevronLeftIcon className="size-4" />
                <span className="sr-only">Scroll left</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className={cn("size-8", ARROW_CLASSES[tone])}
                onClick={() => scrollBy(320)}
              >
                <ChevronRightIcon className="size-4" />
                <span className="sr-only">Scroll right</span>
              </Button>
            </div>
          )}
        </div>
      </div>
      {isLoading ? (
        <div className="flex gap-6 overflow-hidden">
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <div key={i} className="flex w-48 shrink-0 flex-col gap-2">
              <Skeleton className="aspect-square w-full rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      ) : hasProducts ? (
        <div ref={scrollRef} className="scrollbar-fade flex snap-x gap-6 overflow-x-auto pb-2">
          {products.map((product) => (
            <div key={product.id} className="w-48 shrink-0 snap-start">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      ) : (
        <p className="py-4 text-sm text-muted-foreground">{emptyCopy}</p>
      )}
    </section>
  )
}

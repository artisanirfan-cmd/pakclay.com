import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronDownIcon } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { orderFilterTypes, filterTypeLabel, type ActiveFilters } from "@/lib/product-filters"
import type { FilterType } from "@/types/product"

interface FilterBarProps {
  filterGroups: Record<string, FilterType[]>
  facetCounts: Record<string, Record<string, number>>
  activeFilters: ActiveFilters
  isLoading: boolean
  onToggle: (filterType: string, value: string) => void
  onClearAll: () => void
}

/**
 * Desktop horizontal filter bar with flyout checkbox menus — replaces the
 * old per-row chip-pill layout (04-PRODUCT-LISTING-FILTERS.md). Strictly
 * desktop (caller wraps in `hidden lg:block`); mobile uses
 * `MobileFiltersDrawer` instead.
 *
 * Interaction model: single-active flyout (opening one closes the other),
 * click-outside dismisses, Escape key closes. Each facet's dropdown is
 * positioned absolutely under its trigger via `getBoundingClientRect`.
 */
export function FilterBar({
  filterGroups,
  facetCounts,
  activeFilters,
  isLoading,
  onToggle,
  onClearAll,
}: FilterBarProps) {
  const orderedTypes = orderFilterTypes(Object.keys(filterGroups))
  const hasActiveFilters = Object.values(activeFilters).some((values) => values.length > 0)

  const [openFacet, setOpenFacet] = useState<string | null>(null)
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({})
  const barRef = useRef<HTMLDivElement>(null)
  const triggerRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  // Close popover on click-outside
  useEffect(() => {
    if (!openFacet) return
    function handleClickOutside(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenFacet(null)
      }
    }
    // Defer so the opening click doesn't immediately fire this handler
    const id = requestAnimationFrame(() => {
      document.addEventListener("mousedown", handleClickOutside)
    })
    return () => {
      cancelAnimationFrame(id)
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [openFacet])

  // Close popover on Escape
  useEffect(() => {
    if (!openFacet) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenFacet(null)
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [openFacet])

  // Position the popover under the active trigger
  const updatePosition = useCallback(
    (facet: string) => {
      const trigger = triggerRefs.current.get(facet)
      const bar = barRef.current
      if (!trigger || !bar) return
      const triggerRect = trigger.getBoundingClientRect()
      const barRect = bar.getBoundingClientRect()
      setPopoverStyle({
        top: barRect.bottom + 8,
        left: Math.max(
          16,
          Math.min(
            triggerRect.left + triggerRect.width / 2 - 140,
            window.innerWidth - 300
          )
        ),
      })
    },
    []
  )

  function handleTriggerClick(facet: string) {
    if (openFacet === facet) {
      setOpenFacet(null)
    } else {
      setOpenFacet(facet)
      // Use rAF so the DOM has settled before measuring
      requestAnimationFrame(() => updatePosition(facet))
    }
  }

  function handleClearFacet(facet: string) {
    // Toggle off every active value in this facet
    for (const value of activeFilters[facet] ?? []) {
      onToggle(facet, value)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-24 rounded" />
        ))}
      </div>
    )
  }

  if (orderedTypes.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      {/* Title row */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold tracking-wide text-foreground uppercase">
          Filters
        </span>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Horizontal bar */}
      <div
        ref={barRef}
        className="relative flex items-center gap-0 rounded-[3px] bg-muted px-3 py-2.5"
      >
        {orderedTypes.map((filterType) => {
          const isOpen = openFacet === filterType
          const activeCount = activeFilters[filterType]?.length ?? 0
          const values = filterGroups[filterType]
          const counts = facetCounts[filterType] ?? {}
          // Sort values alphabetically by label for the dropdown
          const sortedValues = [...values].sort((a, b) => a.value.localeCompare(b.value))

          return (
            <div key={filterType} className="relative">
              {/* Trigger button */}
              <button
                ref={(el) => {
                  if (el) triggerRefs.current.set(filterType, el)
                  else triggerRefs.current.delete(filterType)
                }}
                type="button"
                className={cn(
                  "inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-foreground/90 transition-opacity",
                  "hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm",
                  isOpen && "opacity-75"
                )}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                onClick={() => handleTriggerClick(filterType)}
              >
                <span>{filterTypeLabel(filterType)}</span>
                {activeCount > 0 && (
                  <span className="text-xs font-semibold text-foreground">
                    ({activeCount})
                  </span>
                )}
                <ChevronDownIcon
                  className={cn(
                    "size-3.5 shrink-0 transition-transform duration-200",
                    isOpen && "rotate-180"
                  )}
                  strokeWidth={2.5}
                  aria-hidden="true"
                />
              </button>

              {/* Flyout popover */}
              {isOpen && (
                <div
                  className="fixed z-50 w-[280px] rounded-md border border-border bg-white shadow-lg shadow-black/10"
                  style={{ top: popoverStyle.top, left: popoverStyle.left }}
                  role="group"
                  aria-label={`${filterTypeLabel(filterType)} filter values`}
                >
                  {/* Dropdown header */}
                  {activeCount > 0 && (
                    <div className="flex items-center justify-between border-b border-border px-4 py-2">
                      <span className="text-xs text-muted-foreground">
                        {activeCount} selected
                      </span>
                      <button
                        type="button"
                        onClick={() => handleClearFacet(filterType)}
                        className="text-xs font-medium text-foreground/70 underline-offset-2 hover:text-foreground hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  )}

                  {/* Checkbox list */}
                  <ul className="max-h-[280px] overflow-y-auto py-1" role="listbox" aria-multiselectable="true">
                    {sortedValues.map((option) => {
                      const isChecked =
                        activeFilters[filterType]?.includes(option.value) ?? false
                      const count = counts[option.value] ?? 0

                      return (
                        <li
                          key={option.id}
                          role="option"
                          aria-selected={isChecked}
                          className="flex cursor-pointer items-center gap-3 px-4 py-2 transition-colors hover:bg-muted"
                          onClick={() => onToggle(filterType, option.value)}
                        >
                          <Checkbox
                            checked={isChecked}
                            className={cn(
                              "size-4 rounded-[2px] border transition-colors",
                              isChecked
                                ? "border-foreground bg-foreground text-background"
                                : "border-muted-foreground/50 bg-white"
                            )}
                          />
                          <span
                            className={cn(
                              "flex-1 text-sm",
                              isChecked ? "font-medium text-foreground" : "text-foreground/80"
                            )}
                          >
                            {formatFilterValue(option.value)}
                          </span>
                          {count > 0 && (
                            <span className="text-xs text-muted-foreground tabular-nums">
                              ({count})
                            </span>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Convert a slug-form filter value into a human-readable label.
 * e.g. "natural-unglazed" → "Natural / Unglazed", "rust-red" → "Rust Red"
 * Handles known compound tokens that need a "/" separator instead of a space.
 */
const SLASH_COMPOUNDS = new Set([
  "natural-unglazed",
  "textured-rustic",
  "screen-partition",
  "screen-jali-tile",
])

function formatFilterValue(slug: string): string {
  if (SLASH_COMPOUNDS.has(slug)) {
    return slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" / ")
  }
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

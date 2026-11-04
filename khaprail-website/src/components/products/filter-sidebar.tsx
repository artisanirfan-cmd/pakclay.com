import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { orderFilterTypes, filterTypeLabel, type ActiveFilters } from "@/lib/product-filters"
import type { FilterType } from "@/types/product"

interface FilterSidebarProps {
  filterGroups: Record<string, FilterType[]>
  facetCounts: Record<string, Record<string, number>>
  activeFilters: ActiveFilters
  isLoading: boolean
  onToggle: (filterType: string, value: string) => void
  onClearAll: () => void
}

// Left-hand filter column for the category listing (Option B redesign,
// 2026-11-05): every filter group is open at once as a plain checkbox list,
// so nothing hides behind a flyout. Same data and URL-reflected state as the
// horizontal FilterBar (filter groups come from the admin-editable
// `filter_types` table). On phones it collapses into a native <details>.
export function FilterSidebar({
  filterGroups,
  facetCounts,
  activeFilters,
  isLoading,
  onToggle,
  onClearAll,
}: FilterSidebarProps) {
  const orderedTypes = orderFilterTypes(Object.keys(filterGroups))
  const activeTotal = Object.values(activeFilters).reduce((sum, values) => sum + values.length, 0)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    )
  }
  if (orderedTypes.length === 0) return null

  const groups = (
    <div className="flex flex-col gap-7">
      {orderedTypes.map((filterType) => {
        const counts = facetCounts[filterType] ?? {}
        const options = [...filterGroups[filterType]].sort((a, b) => a.value.localeCompare(b.value))
        return (
          <fieldset key={filterType} className="flex flex-col gap-2.5">
            <legend className="mb-1 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              {filterTypeLabel(filterType)}
            </legend>
            {options.map((option) => {
              const checked = activeFilters[filterType]?.includes(option.value) ?? false
              const count = counts[option.value] ?? 0
              const id = `filter-${filterType}-${option.id}`
              return (
                <label key={option.id} htmlFor={id} className="flex cursor-pointer items-center gap-3 py-0.5 text-[15px]">
                  <Checkbox id={id} checked={checked} onCheckedChange={() => onToggle(filterType, option.value)} />
                  <span className={cn("flex-1", checked ? "font-medium text-foreground" : "text-foreground/80")}>
                    {formatValue(option.value)}
                  </span>
                  {count > 0 && <span className="text-xs text-muted-foreground tabular-nums">{count}</span>}
                </label>
              )
            })}
          </fieldset>
        )
      })}
      {activeTotal > 0 && (
        <button
          type="button"
          onClick={onClearAll}
          className="self-start text-sm font-medium text-primary underline-offset-2 hover:underline"
        >
          Clear all filters
        </button>
      )}
    </div>
  )

  return (
    <>
      <details className="rounded-2xl border border-border px-4 py-3 lg:hidden">
        <summary className="cursor-pointer text-base font-semibold">
          Filters{activeTotal > 0 ? ` (${activeTotal})` : ""}
        </summary>
        <div className="pt-5 pb-2">{groups}</div>
      </details>
      <div className="hidden lg:block">
        <h2 className="mb-5 text-lg font-semibold">Filter</h2>
        {groups}
      </div>
    </>
  )
}

function formatValue(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

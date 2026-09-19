import { useDocumentHead } from "@/hooks/use-document-head"
import { useEffect, useState } from "react"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { FilterBar } from "@/components/products/filter-bar"
import { MobileFiltersDrawer } from "@/components/products/mobile-filters-drawer"
import { ProductCard } from "@/components/products/product-card"
import { Pagination } from "@/components/shared/pagination"
import { useFilterTypes } from "@/hooks/use-filter-types"
import { useProducts } from "@/hooks/use-products"
import {
  filtersToSearchParams,
  parseFiltersFromSearchParams,
  parseSortFromSearchParams,
  toggleFilterValue,
  type SortOption,
} from "@/lib/product-filters"

const PAGE_SIZE = 12

// The mobile filters drawer's open state lives in the URL hash rather than
// a query param, since `parseFiltersFromSearchParams` treats every query
// key except `sort` as a real filter type — a `?mfilters=1` param would be
// misread as an attribute filter and silently break the product query.
const MOBILE_FILTERS_HASH = "#mobile-filters"

// /products — filterable listing (04-PRODUCT-LISTING-FILTERS.md). Filters
// reflect into the URL so views are shareable/bookmarkable/indexable. On
// mobile, the chip-row `FilterBar` is replaced by `MobileFiltersDrawer` (a
// two-pane facet drill-down opened from the bottom tab bar) — both drive
// the exact same `activeFilters` state.
export function ProductsListing() {
  useDocumentHead({
    title: "Shop All Tiles — Roof, Floor & Wall Tiles",
    description:
      "Browse every clay roof tile, terracotta floor tile, Multani tile and stone wall tile we offer. Filter by type, pattern, material, finish and color.",
    path: "/products",
  })
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const mobileFiltersOpen = location.hash === MOBILE_FILTERS_HASH
  const activeFilters = parseFiltersFromSearchParams(searchParams)
  const sort = parseSortFromSearchParams(searchParams)
  const [page, setPage] = useState(1)

  const { filterGroups, isLoading: filtersLoading } = useFilterTypes()
  const { products, facetCounts, isLoading: productsLoading, error } = useProducts(activeFilters, sort)

  useEffect(() => {
    setPage(1)
  }, [searchParams])

  const pageCount = Math.max(1, Math.ceil(products.length / PAGE_SIZE))
  const pagedProducts = products.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Navigates with the new search params while preserving the current URL
  // hash — `useSearchParams`'s setter drops the hash entirely, which would
  // otherwise close the mobile filters drawer (its open state is
  // `location.hash === '#mobile-filters'`) on every single filter tap.
  function applySearchParams(next: URLSearchParams) {
    const search = next.toString()
    navigate(`${location.pathname}${search ? `?${search}` : ""}${location.hash}`, { replace: true })
  }

  function handleToggle(filterType: string, value: string) {
    const next = toggleFilterValue(activeFilters, filterType, value)
    applySearchParams(filtersToSearchParams(next, sort))
  }

  function handleClearAll() {
    applySearchParams(filtersToSearchParams({}, sort))
  }

  function handleSortChange(value: SortOption | null) {
    if (!value) return
    applySearchParams(filtersToSearchParams(activeFilters, value))
  }

  function closeMobileFilters() {
    navigate(`${location.pathname}${location.search}`, { replace: true })
  }

  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-6xl font-semibold sm:text-7xl">Products</h1>
          <p className="mt-2 text-muted-foreground">Browse our full catalog of clay and terracotta tiles.</p>
        </div>

        <div className="mb-8 flex flex-col gap-6 border-b border-border pb-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="hidden lg:block">
            <FilterBar
              filterGroups={filterGroups}
              facetCounts={facetCounts}
              activeFilters={activeFilters}
              isLoading={filtersLoading}
              onToggle={handleToggle}
              onClearAll={handleClearAll}
            />
          </div>
          <Select value={sort} onValueChange={handleSortChange}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="name-asc">Name A–Z</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {productsLoading ? (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="aspect-square w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        ) : error || products.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            Products coming soon.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
              <h2 className="sr-only">Tile products</h2>
              {pagedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
          </>
        )}
      </div>

      <MobileFiltersDrawer
        open={mobileFiltersOpen}
        onClose={closeMobileFilters}
        filterGroups={filterGroups}
        facetCounts={facetCounts}
        activeFilters={activeFilters}
        onToggle={handleToggle}
        onClearAll={handleClearAll}
      />
    </main>
  )
}

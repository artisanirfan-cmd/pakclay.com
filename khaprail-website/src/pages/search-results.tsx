import { useDocumentHead } from "@/hooks/use-document-head"
import { useEffect, useState } from "react"
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom"
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
const MOBILE_FILTERS_HASH = "#mobile-filters"

// /search?q=... — reuses the exact same grid/card/filter-bar/pagination
// stack as /products (products-listing.tsx), just with `useProducts`'s
// `searchQuery` param added — a real name/category match, combined with
// any active filters, not a second competing product query.
export function SearchResults() {
  useDocumentHead({
    title: "Search Tiles",
    description: "Search our range of clay, terracotta, stone and concrete tiles by name, size or category.",
    path: "/search",
    noindex: true,
  })
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const query = searchParams.get("q")?.trim() ?? ""
  const mobileFiltersOpen = location.hash === MOBILE_FILTERS_HASH
  const activeFilters = parseFiltersFromSearchParams(searchParams, ["q"])
  const sort = parseSortFromSearchParams(searchParams)
  const [page, setPage] = useState(1)

  const { filterGroups, isLoading: filtersLoading } = useFilterTypes()
  const { products, facetCounts, isLoading: productsLoading, error } = useProducts(activeFilters, sort, null, query)

  useEffect(() => {
    setPage(1)
  }, [searchParams])

  const pageCount = Math.max(1, Math.ceil(products.length / PAGE_SIZE))
  const pagedProducts = products.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Preserves `q` (and the URL hash, for the mobile filters drawer) on
  // every filter/sort change — same pattern as /products.
  function applySearchParams(next: URLSearchParams) {
    next.set("q", query)
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
          <h1 className="font-heading text-5xl font-semibold sm:text-6xl">
            {query ? <>Search results for &ldquo;{query}&rdquo;</> : "Search"}
          </h1>
          {!productsLoading && !error && query && (
            <p className="mt-2 text-muted-foreground">
              {products.length} {products.length === 1 ? "product" : "products"} found
            </p>
          )}
        </div>

        {!query ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Enter a search term to find products.</p>
        ) : (
          <>
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
              <div className="py-16 text-center">
                <p className="text-sm text-muted-foreground">
                  No products found for &ldquo;{query}&rdquo;. Try browsing our categories instead.
                </p>
                <Link to="/products" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
                  Browse all tiles
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
                  <h2 className="sr-only">Search results</h2>
                  {pagedProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
                <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
              </>
            )}
          </>
        )}
      </div>

      {query && (
        <MobileFiltersDrawer
          open={mobileFiltersOpen}
          onClose={closeMobileFilters}
          filterGroups={filterGroups}
          facetCounts={facetCounts}
          activeFilters={activeFilters}
          onToggle={handleToggle}
          onClearAll={handleClearAll}
        />
      )}
    </main>
  )
}

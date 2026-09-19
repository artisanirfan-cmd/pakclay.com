import { useEffect, useState } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import { ChevronRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FilterBar } from "@/components/products/filter-bar"
import { ProductCard } from "@/components/products/product-card"
import { ProductRail } from "@/components/shared/product-rail"
import { CategoryIconRail } from "@/components/shared/category-icon-rail"
import { Pagination } from "@/components/shared/pagination"
import { useCategory } from "@/hooks/use-category"
import { useCategories } from "@/hooks/use-categories"
import { useFeaturedProducts } from "@/hooks/use-featured-products"
import { useFilterTypes } from "@/hooks/use-filter-types"
import { useProducts } from "@/hooks/use-products"
import { getCategoryAncestors, getCategoryChildren, getDescendantCategoryIds } from "@/lib/category-tree"
import { buildWhatsAppUrl } from "@/lib/whatsapp"
import {
  filtersToSearchParams,
  parseFiltersFromSearchParams,
  parseSortFromSearchParams,
  toggleFilterValue,
  type SortOption,
} from "@/lib/product-filters"

const PAGE_SIZE = 12

// /categories/[slug] — shared template for both main categories and
// subcategories, filtered by category_id (11-CATEGORY-LISTING-SPEC.md).
export function CategoryDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { category, isLoading, error } = useCategory(slug)
  const { categories } = useCategories()
  const [searchParams, setSearchParams] = useSearchParams()
  const [page, setPage] = useState(1)

  const activeFilters = parseFiltersFromSearchParams(searchParams)
  const sort = parseSortFromSearchParams(searchParams)

  // Include products attached to any descendant category, not just this
  // one directly — a root category like Floor Tiles has real products
  // filed under a child (Terracotta Floor Tiles), and the page should show
  // them instead of a false "coming soon" (UX_AUDIT_REPORT.md finding 2.1).
  const categoryIds = category ? getDescendantCategoryIds(categories, category.id) : null

  const topPicks = useFeaturedProducts(8, categoryIds)
  const { filterGroups, isLoading: filtersLoading } = useFilterTypes()
  const { products, facetCounts, isLoading: productsLoading, error: productsError } = useProducts(
    activeFilters,
    sort,
    categoryIds
  )

  useEffect(() => {
    setPage(1)
  }, [searchParams, slug])

  const ancestors = category ? getCategoryAncestors(categories, category.id) : []
  const children = category ? getCategoryChildren(categories, category.id) : []
  const pageCount = Math.max(1, Math.ceil(products.length / PAGE_SIZE))
  const pagedProducts = products.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleToggle(filterType: string, value: string) {
    const next = toggleFilterValue(activeFilters, filterType, value)
    setSearchParams(filtersToSearchParams(next, sort), { replace: true })
  }

  function handleClearAll() {
    setSearchParams(filtersToSearchParams({}, sort), { replace: true })
  }

  function handleSortChange(value: SortOption | null) {
    if (!value) return
    setSearchParams(filtersToSearchParams(activeFilters, value), { replace: true })
  }

  if (isLoading) {
    return (
      <main className="min-h-svh flex-1">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
          <Skeleton className="mx-auto h-8 w-64" />
        </div>
      </main>
    )
  }

  if (error || !category) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-2 px-6 py-24 text-center">
        <h1 className="font-heading text-2xl">Category not found</h1>
        <p className="text-sm text-muted-foreground">
          We couldn't find that category. Browse all categories instead.
        </p>
        <Button className="mt-4" nativeButton={false} render={<Link to="/categories" />}>
          View All Categories
        </Button>
      </main>
    )
  }

  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
        <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground hover:underline">
            Home
          </Link>
          {ancestors.map((ancestor) => (
            <span key={ancestor.id} className="flex items-center gap-1">
              <ChevronRightIcon className="size-3.5" />
              <Link to={`/categories/${ancestor.slug}`} className="hover:text-foreground hover:underline">
                {ancestor.name}
              </Link>
            </span>
          ))}
          <span className="flex items-center gap-1">
            <ChevronRightIcon className="size-3.5" />
            <span className="text-foreground">{category.name}</span>
          </span>
        </nav>

        <h1 className="mb-8 font-heading text-6xl font-semibold sm:text-7xl">{category.name}</h1>

        <div className="mb-12">
          <ProductRail
            title="Top Picks Today"
            emptyCopy="We're still building our top picks for this category — check back soon."
            products={topPicks.products}
            isLoading={topPicks.isLoading}
            hideWhenEmpty
            minCount={3}
            tone="warm"
          />
        </div>

        {children.length > 0 && (
          <div className="mb-12">
            <h2 className="mb-4 font-heading text-3xl font-semibold">Explore {category.name}</h2>
            <CategoryIconRail categories={children} />
          </div>
        )}

        <div className="mb-8 flex flex-col gap-6 border-b border-border pb-8 sm:flex-row sm:items-start sm:justify-between">
          <FilterBar
            filterGroups={filterGroups}
            facetCounts={facetCounts}
            activeFilters={activeFilters}
            isLoading={filtersLoading}
            onToggle={handleToggle}
            onClearAll={handleClearAll}
          />
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
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="aspect-square w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        ) : productsError || products.length === 0 ? (
          <div className="text-center">
            <p className="text-muted-foreground">
              Products in this category are coming soon. In the meantime, get in touch and we'll walk you through
              what's available.
            </p>
            <Button
              size="lg"
              className="mt-6 h-12 px-6 text-base"
              nativeButton={false}
              render={
                <a
                  href={buildWhatsAppUrl(`Hi, I'm interested in ${category.name}. Could you share more details?`)}
                  target="_blank"
                  rel="noreferrer"
                />
              }
            >
              Ask About {category.name} on WhatsApp
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
              {pagedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
          </>
        )}
      </div>
    </main>
  )
}

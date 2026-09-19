import { lazy, Suspense } from "react"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import { ScrollToTop } from "@/components/layout/scroll-to-top"
import { SiteLayout } from "@/components/layout/site-layout"
import { RouteLoadingFallback } from "@/components/shared/route-loading-fallback"
import { Home } from "@/pages/home"

// SEO/perf batch A (2026-09-10, see 00-PROGRESS.md): every route was
// previously a static import, so a first-time visitor to the homepage
// downloaded the entire app in one bundle — every admin CRUD editor, the
// blog editor, every storefront page — before React could render anything.
// `lazy()` splits each route into its own chunk, fetched only when that
// route is actually visited; Vite/Rollup handles the chunking automatically
// from these dynamic `import()` calls, no manual `manualChunks` config
// needed. The admin section in particular (16 routes, never visited by a
// public/crawler request) no longer ships to storefront visitors at all.
//
// `Home` is the one exception, kept as a normal static import: measured
// live (re-ran Lighthouse after lazy-loading it too) and lazy-loading the
// single overwhelmingly-most-common landing page actually made LCP/FCP/TBT
// *worse* — it adds one extra network round-trip (fetch the "home" chunk)
// before the hero/LCP image can even start rendering, which costs more than
// the ~24KB it would have saved. Every other route keeps the real byte
// savings from splitting with none of that downside, since they aren't the
// default landing page.
// Admin shell pieces are lazy too (previously static, so AdminLayout, the
// auth-session provider and ProtectedRoute all shipped in the public entry
// chunk and the session bootstrap ran on every storefront page view).
const AdminAuthShell = lazy(() => import("@/components/admin/admin-auth-shell").then((m) => ({ default: m.AdminAuthShell })))
const ProtectedRoute = lazy(() => import("@/components/admin/protected-route").then((m) => ({ default: m.ProtectedRoute })))
const AdminLayout = lazy(() => import("@/components/admin/admin-layout").then((m) => ({ default: m.AdminLayout })))
const CategoriesIndex = lazy(() => import("@/pages/categories-index").then((m) => ({ default: m.CategoriesIndex })))
const CategoryDetail = lazy(() => import("@/pages/category-detail").then((m) => ({ default: m.CategoryDetail })))
const ProductsListing = lazy(() => import("@/pages/products-listing").then((m) => ({ default: m.ProductsListing })))
const SearchResults = lazy(() => import("@/pages/search-results").then((m) => ({ default: m.SearchResults })))
const ProductDetail = lazy(() => import("@/pages/product-detail").then((m) => ({ default: m.ProductDetail })))
const NewArrivals = lazy(() => import("@/pages/new-arrivals").then((m) => ({ default: m.NewArrivals })))
const BestSellers = lazy(() => import("@/pages/best-sellers").then((m) => ({ default: m.BestSellers })))
const About = lazy(() => import("@/pages/about").then((m) => ({ default: m.About })))
const Contact = lazy(() => import("@/pages/contact").then((m) => ({ default: m.Contact })))
const Videos = lazy(() => import("@/pages/videos").then((m) => ({ default: m.Videos })))
const Downloads = lazy(() => import("@/pages/downloads").then((m) => ({ default: m.Downloads })))
const BlogIndex = lazy(() => import("@/pages/blog-index").then((m) => ({ default: m.BlogIndex })))
const BlogPost = lazy(() => import("@/pages/blog-post").then((m) => ({ default: m.BlogPost })))

const AdminLogin = lazy(() => import("@/pages/admin/login").then((m) => ({ default: m.AdminLogin })))
const DashboardHome = lazy(() => import("@/pages/admin/dashboard-home").then((m) => ({ default: m.DashboardHome })))
const AdminProductsList = lazy(() =>
  import("@/pages/admin/products-list").then((m) => ({ default: m.AdminProductsList }))
)
const AdminProductEditor = lazy(() =>
  import("@/pages/admin/product-editor").then((m) => ({ default: m.AdminProductEditor }))
)
const AdminCategoriesList = lazy(() =>
  import("@/pages/admin/categories-list").then((m) => ({ default: m.AdminCategoriesList }))
)
const AdminCategoryEditor = lazy(() =>
  import("@/pages/admin/category-editor").then((m) => ({ default: m.AdminCategoryEditor }))
)
const AdminFilterTypesList = lazy(() =>
  import("@/pages/admin/filter-types-list").then((m) => ({ default: m.AdminFilterTypesList }))
)
const AdminBlogList = lazy(() => import("@/pages/admin/blog-list").then((m) => ({ default: m.AdminBlogList })))
const AdminBlogEditor = lazy(() => import("@/pages/admin/blog-editor").then((m) => ({ default: m.AdminBlogEditor })))
const AdminSampleInquiriesList = lazy(() =>
  import("@/pages/admin/sample-inquiries-list").then((m) => ({ default: m.AdminSampleInquiriesList }))
)
const AdminLifestyleTilesList = lazy(() =>
  import("@/pages/admin/lifestyle-tiles-list").then((m) => ({ default: m.AdminLifestyleTilesList }))
)
const AdminLifestyleTileEditor = lazy(() =>
  import("@/pages/admin/lifestyle-tile-editor").then((m) => ({ default: m.AdminLifestyleTileEditor }))
)
const AdminOfferCardsList = lazy(() =>
  import("@/pages/admin/offer-cards-list").then((m) => ({ default: m.AdminOfferCardsList }))
)
const AdminOfferCardEditor = lazy(() =>
  import("@/pages/admin/offer-card-editor").then((m) => ({ default: m.AdminOfferCardEditor }))
)
const AdminTrendingTilesList = lazy(() =>
  import("@/pages/admin/trending-tiles-list").then((m) => ({ default: m.AdminTrendingTilesList }))
)
const AdminTrendingTileEditor = lazy(() =>
  import("@/pages/admin/trending-tile-editor").then((m) => ({ default: m.AdminTrendingTileEditor }))
)

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/categories" element={<CategoriesIndex />} />
          <Route path="/categories/:slug" element={<CategoryDetail />} />
          <Route path="/products" element={<ProductsListing />} />
          <Route path="/products/:slug" element={<ProductDetail />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/new-arrivals" element={<NewArrivals />} />
          <Route path="/best-sellers" element={<BestSellers />} />
          <Route path="/videos" element={<Videos />} />
          <Route path="/downloads" element={<Downloads />} />
          <Route path="/blog" element={<BlogIndex />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/contact" element={<Contact />} />
        </Route>

        {/* Admin gets its own chrome, not the storefront's SiteLayout
            (07-ADMIN-DASHBOARD-SPEC.md). /admin/login is the only public
            admin route, and isn't nested in a layout with its own
            Suspense boundary (see admin-layout.tsx), so it gets one of
            its own; everything else requires a session. */}
        <Route
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <AdminAuthShell />
            </Suspense>
          }
        >
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<DashboardHome />} />
              <Route path="/admin/products" element={<AdminProductsList />} />
              <Route path="/admin/products/new" element={<AdminProductEditor />} />
              <Route path="/admin/products/:id/edit" element={<AdminProductEditor />} />
              <Route path="/admin/categories" element={<AdminCategoriesList />} />
              <Route path="/admin/categories/new" element={<AdminCategoryEditor />} />
              <Route path="/admin/categories/:id/edit" element={<AdminCategoryEditor />} />
              <Route path="/admin/filter-types" element={<AdminFilterTypesList />} />
              <Route path="/admin/blog" element={<AdminBlogList />} />
              <Route path="/admin/blog/new" element={<AdminBlogEditor />} />
              <Route path="/admin/blog/:id/edit" element={<AdminBlogEditor />} />
              <Route path="/admin/sample-inquiries" element={<AdminSampleInquiriesList />} />
              <Route path="/admin/lifestyle-tiles" element={<AdminLifestyleTilesList />} />
              <Route path="/admin/lifestyle-tiles/new" element={<AdminLifestyleTileEditor />} />
              <Route path="/admin/lifestyle-tiles/:id/edit" element={<AdminLifestyleTileEditor />} />
              <Route path="/admin/offer-cards" element={<AdminOfferCardsList />} />
              <Route path="/admin/offer-cards/new" element={<AdminOfferCardEditor />} />
              <Route path="/admin/offer-cards/:id/edit" element={<AdminOfferCardEditor />} />
              <Route path="/admin/trending-tiles" element={<AdminTrendingTilesList />} />
              <Route path="/admin/trending-tiles/new" element={<AdminTrendingTileEditor />} />
              <Route path="/admin/trending-tiles/:id/edit" element={<AdminTrendingTileEditor />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App

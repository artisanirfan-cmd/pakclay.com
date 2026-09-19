// Suspense fallback for lazy-loaded route chunks (App.tsx) — shown only for
// the split-second a route's JS chunk is still downloading, inside the
// layout's `<Outlet />` boundary so the header/footer/nav chrome around it
// never disappears. Deliberately minimal (no skeleton shapes to avoid
// implying a specific page layout that isn't there yet). It reserves a full
// viewport of height (`min-h-svh`) so the footer stays below the fold while
// the route loads — a shorter fallback let the footer sit in view and then
// jump when the page rendered (a large Cumulative Layout Shift on PDPs, blog
// posts and category pages).
export function RouteLoadingFallback() {
  return (
    <div className="flex min-h-svh flex-1 items-start justify-center pt-24" role="status" aria-label="Loading">
      <span className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  )
}

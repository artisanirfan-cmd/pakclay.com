import { useEffect } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"

// Rendered for any URL that matches no route. The server also answers these
// URLs with a real HTTP 404 (server/lib/pages.ts) — a page that says "not
// found" but returns 200 is a "soft 404" that search engines index as
// duplicate content — and this page adds `noindex` as a second signal.
export function NotFound() {
  useEffect(() => {
    const meta = document.createElement("meta")
    meta.name = "robots"
    meta.content = "noindex"
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-3 px-6 py-24 text-center">
      <h1 className="font-heading text-4xl font-semibold sm:text-5xl">Page not found</h1>
      <p className="text-muted-foreground">
        We couldn't find the page you were looking for. It may have moved, or the address may be mistyped.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <Button nativeButton={false} render={<Link to="/" />}>
          Back to Home
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link to="/products" />}>
          Browse Products
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link to="/categories" />}>
          View Categories
        </Button>
      </div>
    </main>
  )
}

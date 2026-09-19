import { Link } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StorageImage } from "@/components/shared/storage-image"
import { buildSampleRequestMessage, buildWhatsAppUrl } from "@/lib/whatsapp"
import type { Product } from "@/types/product"

const NEW_ARRIVAL_WINDOW_DAYS = 60

// `is_new` is a real editorial decision (admin checkbox, tri-state: true
// always shows the badge, false always hides it) and always wins when set.
// The `created_at`-window check only kicks in when nobody has made that
// call yet (`is_new === null`) — it stays a real "this really is recent"
// signal for future products added days/weeks apart, but the whole catalog
// being bulk-inserted in one session meant it covered almost every card
// with no real signal value, so existing rows were explicitly backfilled
// to `false` rather than left to the fallback (UX_AUDIT_REPORT.md finding 3).
function isNewArrival(product: Pick<Product, "is_new" | "created_at">): boolean {
  if (product.is_new !== null) return product.is_new
  const ageMs = Date.now() - new Date(product.created_at).getTime()
  return ageMs < NEW_ARRIVAL_WINDOW_DAYS * 24 * 60 * 60 * 1000
}

interface ProductCardProps {
  product: Product
}

// Listing card per 04-PRODUCT-LISTING-FILTERS.md: white/light photo tile on
// a dark card, gold price (only when a real `price` is set), solid blue pill
// "Get a Sample" CTA. "New Arrival" is a real editorial decision (`is_new`),
// falling back to `created_at` only when unset — no generic "Deal"/percent-off
// badge was added since no real discount data exists (02-DESIGN-SYSTEM.md
// "honest data only").
export function ProductCard({ product }: ProductCardProps) {
  return (
    <Card className="gap-0 overflow-hidden p-0">
      <Link to={`/products/${product.slug}`} className="group/link outline-none">
        <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-white">
          {product.cover_image_url && (
            // Real WebP/quality/size optimization via Supabase's transform
            // endpoint (SEO/perf batch A, 2026-09-10) — plus explicit
            // width/height this card never had, reserving layout space
            // before load (the `aspect-square` container already prevents
            // shift, but every other image on the site now sets these too).
            <StorageImage
              src={product.cover_image_url}
              alt=""
              width={320}
              height={320}
              className="h-full w-full object-cover"
            />
          )}
          {isNewArrival(product) && (
            <Badge className="absolute top-2 left-2 bg-badge-accent text-badge-accent-foreground">New Arrival</Badge>
          )}
        </div>
        <CardContent className="flex flex-col gap-1 pt-3 pb-3">
          {product.price != null && (
            <p className="font-heading text-lg font-semibold text-price">PKR {product.price.toLocaleString()}</p>
          )}
          <h3 className="text-base font-medium text-foreground group-hover/link:underline">{product.name}</h3>
          {product.size && <p className="text-sm text-muted-foreground">{product.size}</p>}
        </CardContent>
      </Link>
      <CardContent className="pb-4">
        <Button
          size="sm"
          className="w-full rounded-full"
          nativeButton={false}
          render={
            <a
              href={buildWhatsAppUrl(buildSampleRequestMessage(product.name))}
              target="_blank"
              rel="noreferrer"
            />
          }
        >
          Get a Sample
        </Button>
      </CardContent>
    </Card>
  )
}

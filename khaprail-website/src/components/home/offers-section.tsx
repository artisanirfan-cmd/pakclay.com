import { Link } from "react-router-dom"
import { Skeleton } from "@/components/ui/skeleton"
import { StorageImage } from "@/components/shared/storage-image"
import { useOfferCards } from "@/hooks/use-offer-cards"
import { cn } from "@/lib/utils"
import type { OfferCard } from "@/types/offer-card"

const SKELETON_COUNT = 4

// Column count matches however many active cards exist (never reserves 4
// empty slots) — 4 -> 1/2/4 col responsive, 3 -> 1/2/3, 2 -> 1/2, 1 -> 1.
const GRID_COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
}

function isExternalUrl(url: string): boolean {
  return /^https?:\/\//.test(url)
}

// "Offers, Available Now" — deliberately not framed as a limited-time/
// seasonal promotion (no percentage-off discount exists yet). Cards
// describe real, always-true capabilities (free samples, bulk pricing,
// delivery, new-customer welcome), fully admin-editable via
// `/admin/offer-cards` so real numbers/terms can replace the current
// wording the moment an actual promotion is confirmed — no code change
// needed. Dark-to-image gradient card per the reference, terracotta accent
// instead of the reference's blue.
export function OffersSection() {
  const { cards, isLoading, error } = useOfferCards()

  if (error || (!isLoading && cards.length === 0)) return null

  const columnsClass = GRID_COLS[Math.min(cards.length, 4)] ?? GRID_COLS[4]

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <h2 className="mb-8 text-center font-heading text-4xl font-semibold text-foreground sm:text-5xl">
        Offers, Available Now
      </h2>
      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className={cn("grid gap-6", columnsClass)}>
          {cards.map((card) => (
            <OfferCardTile key={card.id} card={card} />
          ))}
        </div>
      )}
    </section>
  )
}

function OfferCardTile({ card }: { card: OfferCard }) {
  const linkClassName =
    "relative z-10 mt-4 w-fit text-sm font-semibold text-navy-foreground underline underline-offset-4 hover:text-primary-on-dark"

  return (
    <div className="relative flex aspect-[3/4] flex-col justify-between overflow-hidden rounded-2xl bg-navy p-5">
      {/* Real WebP/quality/size optimization via Supabase's transform
          endpoint (SEO/perf batch A, 2026-09-10) — this exact image (one of
          this batch's live-confirmed multi-MB offenders) was previously
          served at full source size into a ~380x250px slot. */}
      <StorageImage
        src={card.image_url}
        alt={card.image_alt_text}
        width={500}
        height={330}
        className="absolute inset-x-0 bottom-0 h-2/3 w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/85 to-navy/20" />

      <div className="relative z-10 flex flex-col gap-1">
        <div className="flex items-baseline gap-1.5">
          <span className="font-heading text-4xl font-bold text-primary-on-dark">{card.badge_value}</span>
          {card.badge_suffix && (
            <span className="text-sm font-semibold text-navy-foreground/80">{card.badge_suffix}</span>
          )}
        </div>
        <p className="text-sm text-navy-foreground/90">{card.label}</p>
      </div>

      {isExternalUrl(card.link_url) ? (
        <a href={card.link_url} target="_blank" rel="noreferrer" className={linkClassName}>
          {card.link_label}
        </a>
      ) : (
        <Link to={card.link_url} className={linkClassName}>
          {card.link_label}
        </Link>
      )}
    </div>
  )
}

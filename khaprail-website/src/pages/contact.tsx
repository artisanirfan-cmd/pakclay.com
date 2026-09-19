import { useDocumentHead } from "@/hooks/use-document-head"
import { ClockIcon, MailIcon, MapPinIcon, PhoneIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { buildWhatsAppUrl } from "@/lib/whatsapp"
import { CONTACT_EMAIL, CONTACT_HOURS, CONTACT_LOCATIONS, CONTACT_PHONES } from "@/lib/contact-info"

// /contact (01-SITE-MAP.md). WhatsApp is still the fastest way to reach us,
// but the real email/phone/locations/hours (2026-09-10, see 00-PROGRESS.md
// batch 33) are now shown here too, kept in sync with the footer via one
// shared `lib/contact-info.ts` source of truth.
export function Contact() {
  useDocumentHead({
    title: "Contact & Locations — Lahore and Islamabad",
    description:
      "Call, email or WhatsApp us about clay and terracotta tiles. Visit our Lahore head office on Walton Road or our Islamabad location in Gulberg Greens.",
    path: "/contact",
  })
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center gap-6 px-4 py-24 text-center sm:px-6">
      <h1 className="font-heading text-6xl font-semibold sm:text-7xl">Get in Touch</h1>
      <p className="max-w-lg text-lg text-muted-foreground">
        The fastest way to reach us is WhatsApp — message us for samples, pricing, or anything else about our
        clay and terracotta tiles.
      </p>
      <Button
        size="lg"
        className="h-12 px-6 text-base"
        nativeButton={false}
        render={
          <a href={buildWhatsAppUrl("Hi, I have a question about your tiles.")} target="_blank" rel="noreferrer" />
        }
      >
        Message Us on WhatsApp
      </Button>

      <div className="mt-6 flex w-full flex-col items-center gap-3 text-base text-muted-foreground">
        <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-2 hover:text-foreground">
          <MailIcon className="size-4 shrink-0" aria-hidden="true" />
          {CONTACT_EMAIL}
        </a>
        {CONTACT_PHONES.map((phone) => (
          <a key={phone.href} href={phone.href} className="flex items-center gap-2 hover:text-foreground">
            <PhoneIcon className="size-4 shrink-0" aria-hidden="true" />
            {phone.display}
          </a>
        ))}
        <div className="flex items-start gap-2">
          <ClockIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div className="flex flex-col text-left">
            {CONTACT_HOURS.map((row) => (
              <span key={row.days}>
                {row.days}: {row.hours}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid w-full gap-6 text-left sm:grid-cols-2">
        {CONTACT_LOCATIONS.map((location) => (
          <div key={location.label} className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPinIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-medium text-foreground">{location.label}</p>
              <p>{location.address}</p>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}

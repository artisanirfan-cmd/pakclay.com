import { Link } from "react-router-dom"
import { ClockIcon, ExternalLinkIcon, MailIcon, MapPinIcon, PhoneIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NAV_LINKS } from "@/lib/nav-links"
import { buildWhatsAppUrl, DEFAULT_WHATSAPP_MESSAGE } from "@/lib/whatsapp"
import { CONTACT_EMAIL, CONTACT_HOURS, CONTACT_LOCATIONS, CONTACT_PHONES, COPYRIGHT_LINE } from "@/lib/contact-info"
import { SOCIAL_LINKS } from "@/lib/social-links"
import { SUB_BRANDS } from "@/lib/sub-brands"
import { useLinkableCategories } from "@/hooks/use-linkable-categories"
import { getRootCategories } from "@/lib/category-tree"

const FOOTER_CATEGORY_LIMIT = 8

// Solid navy footer (2026-08-25 restyle): Brand/Categories/Quick Links/
// Our Brands/Contact columns, plus a social icon row and the real
// email/phone/locations/hours (2026-09-10 — see 00-PROGRESS.md batch 33;
// all real, confirmed values, not placeholders).
export function SiteFooter() {
  const { categories } = useLinkableCategories()
  const roots = getRootCategories(categories).slice(0, FOOTER_CATEGORY_LIMIT)

  return (
    <footer className="bg-navy text-navy-foreground">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-5">
        <div>
          <p className="font-heading text-lg font-semibold">PAKCLAY.COM</p>
          <p className="mt-1 text-sm text-navy-foreground/70">Est. 1982 · Lahore, Pakistan</p>
          <Button
            className="mt-4 h-11 rounded-full"
            nativeButton={false}
            render={<a href={buildWhatsAppUrl(DEFAULT_WHATSAPP_MESSAGE)} target="_blank" rel="noreferrer" />}
          >
            Chat on WhatsApp
          </Button>
          <div className="mt-5 flex items-center gap-3">
            {SOCIAL_LINKS.map(({ label, url, Icon }) => (
              <a
                key={label}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="flex size-9 items-center justify-center rounded-full bg-navy-foreground/10 text-navy-foreground/80 outline-none transition-colors hover:bg-navy-foreground/20 hover:text-navy-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <Icon className="size-4" aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>

        {roots.length > 0 && (
          <div>
            <p className="mb-3 text-sm font-semibold text-navy-foreground">Categories</p>
            <nav className="flex flex-col gap-2 text-sm text-navy-foreground/70">
              {roots.map((category) => (
                <Link key={category.id} to={`/categories/${category.slug}`} className="hover:text-navy-foreground">
                  {category.name}
                </Link>
              ))}
            </nav>
          </div>
        )}

        <div>
          <p className="mb-3 text-sm font-semibold text-navy-foreground">Quick Links</p>
          <nav className="flex flex-col gap-2 text-sm text-navy-foreground/70">
            {NAV_LINKS.map((link) => (
              <Link key={link.to} to={link.to} className="hover:text-navy-foreground">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-navy-foreground">Our Brands</p>
          <nav className="flex flex-col gap-2 text-sm text-navy-foreground/70">
            {SUB_BRANDS.map((brand) =>
              brand.isCurrent ? (
                <a
                  key={brand.name}
                  href={brand.url}
                  aria-current="page"
                  className="font-medium text-navy-foreground hover:underline"
                >
                  {brand.name}
                </a>
              ) : (
                <a
                  key={brand.name}
                  href={brand.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-navy-foreground"
                >
                  {brand.name}
                  <ExternalLinkIcon className="size-3" aria-hidden="true" />
                </a>
              )
            )}
          </nav>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-navy-foreground">Contact</p>
          <div className="flex flex-col gap-3 text-sm text-navy-foreground/70">
            <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-start gap-2 hover:text-navy-foreground">
              <MailIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {CONTACT_EMAIL}
            </a>
            <div className="flex flex-col gap-1">
              {CONTACT_PHONES.map((phone) => (
                <a
                  key={phone.href}
                  href={phone.href}
                  className="flex items-start gap-2 hover:text-navy-foreground"
                >
                  <PhoneIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  {phone.display}
                </a>
              ))}
            </div>
            <div className="flex items-start gap-2">
              <ClockIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <div className="flex flex-col">
                {CONTACT_HOURS.map((row) => (
                  <span key={row.days}>
                    {row.days}: {row.hours}
                  </span>
                ))}
              </div>
            </div>

            <p className="mt-2 text-sm font-semibold text-navy-foreground">Our Locations</p>
            {CONTACT_LOCATIONS.map((location) => (
              <div key={location.label} className="flex items-start gap-2">
                <MapPinIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-medium text-navy-foreground/90">{location.label}</p>
                  <p>{location.address}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-navy-foreground/15 px-4 py-4 text-center text-xs text-navy-foreground/60 sm:px-6">
        {COPYRIGHT_LINE}
      </div>
    </footer>
  )
}

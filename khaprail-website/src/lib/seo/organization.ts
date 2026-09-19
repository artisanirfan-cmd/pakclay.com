import { CONTACT_EMAIL, CONTACT_LOCATIONS, CONTACT_PHONES } from "@/lib/contact-info"
import { SOCIAL_LINKS } from "@/lib/social-links"
import { SITE_NAME, SITE_URL } from "@/lib/site"

// ---------------------------------------------------------------------------
// !!! ENTITY NAME — NEEDS A BUSINESS DECISION (flagged in 00-PROGRESS.md) !!!
// Three names appear on this site, and structured data must pick one legal/
// public entity:
//   * PAKCLAY.COM    — the site's own brand (logo, <title>, og:site_name)
//   * Khaprail Tiles — the manufacturer the page copy describes (est. 1982)
//   * PAKTILES.COM   — the parent group named in the footer ("Part of
//                      PAKTILES.COM", copyright line, info@paktiles.com)
// Until that is decided, `name` matches the site's visible branding
// (PAKCLAY.COM) so Google's site-name signals agree with the markup,
// `alternateName` carries the manufacturer name, and `parent` records the
// group. Change ONLY the values below to re-point every Organization /
// Product / BlogPosting node on the site at once.
// ---------------------------------------------------------------------------
export const ORGANIZATION = {
  name: SITE_NAME,
  alternateName: "Khaprail Tiles",
  parent: { name: "PAKTILES.COM", url: "https://paktiles.com" },
  /** The site's own lockup reads "Est. 1982 · Lahore, Pakistan" beside the name. */
  foundingDate: "1982",
} as const

export const ORGANIZATION_ID = `${SITE_URL}/#organization`
export const ORGANIZATION_LOGO = `${SITE_URL}/favicon-512x512.png`

/** "Opposite Packages Mall Gate 2, Walton Road, Lahore, Pakistan." -> a PostalAddress. */
function toPostalAddress(address: string) {
  const parts = address
    .replace(/\.$/, "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
  const country = parts.pop() // "Pakistan"
  const locality = parts.pop() // "Lahore" / "Islamabad"
  return {
    "@type": "PostalAddress",
    streetAddress: parts.join(", "),
    addressLocality: locality,
    addressCountry: country === "Pakistan" ? "PK" : country,
  }
}

/** Organization node built only from the site's real, single-sourced business data. */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: ORGANIZATION.name,
    alternateName: ORGANIZATION.alternateName,
    url: SITE_URL,
    logo: { "@type": "ImageObject", url: ORGANIZATION_LOGO, width: 512, height: 512 },
    foundingDate: ORGANIZATION.foundingDate,
    email: CONTACT_EMAIL,
    telephone: CONTACT_PHONES[0]?.display,
    address: CONTACT_LOCATIONS.map((l) => toPostalAddress(l.address)),
    contactPoint: CONTACT_PHONES.map((p) => ({
      "@type": "ContactPoint",
      telephone: p.display,
      email: CONTACT_EMAIL,
      contactType: "customer service",
      areaServed: "PK",
    })),
    sameAs: SOCIAL_LINKS.map((s) => s.url),
    parentOrganization: { "@type": "Organization", name: ORGANIZATION.parent.name, url: ORGANIZATION.parent.url },
  }
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    alternateName: ORGANIZATION.alternateName,
    url: `${SITE_URL}/`,
    inLanguage: "en",
    publisher: { "@id": ORGANIZATION_ID },
  }
}

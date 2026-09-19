import { Link } from "react-router-dom"
import { CtaBanner } from "@/components/shared/cta-banner"

// /about — About Us (01-SITE-MAP.md). Only states facts already confirmed
// elsewhere in the project (Est. 1982, Lahore, the product range) — no
// invented founder story or milestones per CLAUDE.md's "never fabricate
// data" rule. Flag to Sylvester if he wants richer company-history copy.
export function About() {
  return (
    <main className="flex-1">
      <section className="border-b border-border bg-muted">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-4 py-20 text-center sm:px-6">
          <span className="rounded-full bg-badge-accent px-4 py-1 text-sm font-medium text-badge-accent-foreground">
            Est. 1982 · Lahore, Pakistan
          </span>
          <h1 className="font-heading text-6xl font-semibold sm:text-7xl">About Khaprail Tiles</h1>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-16 sm:px-6">
        <p className="text-lg text-muted-foreground">
          Khaprail Tiles has shaped clay roof tiles, Multani tiles, and terracotta flooring in Lahore since 1982.
          Every khaprail, disc, and Multani tile we fire uses the same craft the workshop was built on — made for
          real roofs and floors, not just a showroom shelf.
        </p>
        <p className="text-lg text-muted-foreground">
          Our range covers Khaprail Roof Tiles, Multani Tiles, Terracotta Floor Tiles, Wall Tiles, and Outdoor
          Tiles, all fired from local clay in Pakistan.{" "}
          <Link to="/categories" className="text-primary underline-offset-4 hover:underline">
            Browse our categories
          </Link>{" "}
          or get in touch on WhatsApp for a sample.
        </p>
      </section>

      <CtaBanner />
    </main>
  )
}

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Read it first, every time, before doing anything else. Then read `00-PROGRESS.md` to see what's already done.

## Current state of this repo

**Built and deployed.** The real app lives in `khaprail-website/` (Vite + React + TS, Supabase-backed). Migrated off Vercel on 2026-09-18 (see 00-PROGRESS.md) to Hostinger's built-in **hPanel Node.js App hosting** — LiteSpeed's own process manager (`lsnode.js`) launches `khaprail-website/server/start.js` directly via `require()` and handles the reverse-proxy layer itself, so there is no separate PM2 or Nginx config to maintain (an earlier raw-VPS+PM2+Nginx assumption was corrected once the real hosting model was confirmed live — see 00-PROGRESS.md's batch 43 entries). Batches 1–10 in `00-PROGRESS.md` are done: nav/mega-menu, homepage, category listing + filters, PDP, blog, admin dashboard, and real product content are all live. This "Pre-code" note was stale for a long time before being corrected on 2026-08-25 — always check `00-PROGRESS.md`'s batch table (not this file) for the actual current state before assuming something is or isn't built.

Read `00-PROGRESS.md` first every session — its batch table and session log are the source of truth for what exists.

## What this project is

A complete single-brand marketing + catalog website for **Khaprail Tiles** (khaprail.com.pk) — a Lahore, Pakistan clay roof tile / Multani tile / terracotta tile manufacturer, established 1982. Built by SylJo Tech. This is brand site #1 in a planned series of dedicated per-brand tile sites, so the design system must stay clean and reusable, not hardcoded one-off styling.

It is a catalog + lead-generation site (WhatsApp sample requests, spec-sheet downloads), **not** an e-commerce checkout flow — see "Explicitly out of scope" in `07-ADMIN-DASHBOARD-SPEC.md`.

## Stack (must match the existing Artisan project)

- React + Vite, TypeScript
- Supabase (database, storage, auth for admin)
- Deployed on Hostinger's hPanel Node.js App hosting: a real Node/Express server (`khaprail-website/server/index.ts`, launched via the CommonJS-safe bootstrap `khaprail-website/server/start.js`) serves the built app and the API routes. LiteSpeed's `lsnode.js` runs and reverse-proxies the process itself — no PM2, no separate Nginx config. Migrated off Vercel on 2026-09-18.
- shadcn/ui as the component base, Tailwind CSS
- Lucide icons
- @react-pdf/renderer for downloadable spec sheets
- Framer Motion for animation
- React Router
- Anthropic API (Claude Haiku 4.5) via Express routes (`khaprail-website/server/routes/ai-chat.ts`, `.../generate-summary.ts`) for cached PDP summaries + the site-wide chat widget — see 00-PROGRESS.md's AI chatbot batch. The API key is server-only; the client never talks to Anthropic directly.

## Initial setup commands

Once batch 1 begins, this is the scaffold sequence (full detail in `08-UI-LIBRARIES-INSTALL.md`):

```bash
npm create vite@latest khaprail-website -- --template react-ts
cd khaprail-website
npm install @supabase/supabase-js lucide-react @react-pdf/renderer react-router-dom framer-motion
npx shadcn@latest init
npx shadcn@latest add accordion dialog tabs dropdown-menu navigation-menu card badge button input select checkbox sheet
```

There are no lint/test/build commands documented yet because the project hasn't been scaffolded — once `npm create vite` runs, the standard Vite scripts (`npm run dev`, `npm run build`, `npm run lint`) will apply from its generated `package.json`. Add them to this file once real, not before.

To pull additional UI blocks: `npx shadcn@latest add "https://21st.dev/r/<author>/<component>"` (21st.dev registry). Aceternity UI and Magic UI components are copied by hand (no install command) — see `08-UI-LIBRARIES-INSTALL.md` for what each is good for.

## Where everything is documented

All spec docs live at the **repo root** (not in a `docs/` subfolder). Don't re-derive scope from memory or guess — read the relevant doc:

| Doc | Covers |
|---|---|
| `00-PROGRESS.md` | **Read first every session.** Batch status table, open blockers, dated session log. Update it as you complete work. |
| `01-SITE-MAP.md` | Full route/page list, product taxonomy, top nav |
| `02-DESIGN-SYSTEM.md` | Color/type/spacing tokens, HCI/psychology principles to apply |
| `03-MEGA-MENU-SPEC.md` | "Our Collection" image-card dropdown spec |
| `04-PRODUCT-LISTING-FILTERS.md` | Filter system spec (Color/Material/Size/Shape/Roof) |
| `05-PDP-SPEC.md` | Product detail page spec (Daltile-pattern), product data model sketch |
| `06-BLOG-CMS-SPEC.md` | Blog + SEO/AEO/GEO field spec, blog data model sketch |
| `07-ADMIN-DASHBOARD-SPEC.md` | Admin dashboard spec, v1 scope boundaries |
| `08-UI-LIBRARIES-INSTALL.md` | Install commands, component sources, reference repos to study |
| `09-BUILD-ORDER.md` | Batch sequence and session-discipline rules |
| `10-HOMEPAGE-SPEC.md` | Homepage section order and content rules |
| `11-CATEGORY-LISTING-SPEC.md` | Category/subcategory listing page template spec |
| `12-CATEGORY-TAXONOMY.md` | The final 15-category taxonomy (replaces the old flat `collections` concept) |

## Planned architecture (from the specs — build toward this)

**Storefront vs. admin:** two separate layout shells from the start — the admin dashboard (`/admin/*`) gets its own header/sidebar chrome, not a variant of the storefront layout (mirrors the Artisan project's admin pattern).

**Content is Supabase-driven, not hardcoded.** This is the load-bearing architectural rule across every feature: categories, filter values, and blog categories are admin-editable rows, not enums/constants in the code. Concretely:
- `categories` (name, slug, parent_id, cover_image_url, sort_order) — a self-referencing table per `12-CATEGORY-TAXONOMY.md` — drives both the mega-menu and `/categories`; replaces the earlier flat `collections` table
- `filter_types` (filter_type, value, display_order) drives the Color/Material/Size/Shape/Roof filter chips on `/products`
- `products` / `product_images` / `product_attributes` (sketch in `05-PDP-SPEC.md`) back the listing and PDP
- `sample_inquiries` logs "Get a Sample" WhatsApp submissions, surfaced in the admin dashboard
- `blog_posts` / `blog_faqs` (sketch in `06-BLOG-CMS-SPEC.md`) back the blog, with dedicated Content/SEO/AEO-GEO/FAQ tabs in the admin editor and matching JSON-LD (Article + FAQPage) on the public post page

New Arrivals / Best Sellers are computed views over real `created_at`/inquiry data, never manually curated lists — see the "honest data only" rule below.

**Filter URL state:** `/products` filters reflect into the URL (e.g. `?color=terracotta&shape=hexagon`) so filtered views are shareable and indexable — this constrains the filter component to be URL-state-driven rather than local-state-only.

## Working rules for this project

1. **Always update `00-PROGRESS.md` at the end of a work session** — mark what got done, what's half-done, what's blocked, and why. The next session (possibly weeks later, possibly hitting a usage-limit reset) depends on this being accurate, not optimistic.
2. **Never fabricate data.** No fake "X people viewing this" counters, no fake review counts, no placeholder prices presented as real. If a feature needs real data that doesn't exist yet, build it wired to a real (even if currently empty) Supabase table, and flag it in progress notes rather than faking numbers.
3. **Filter values, category names/hierarchy, and blog categories must be admin-editable**, not hardcoded — same pattern as the Artisan project's `filter_types` table.
4. **Match the design tokens in `02-DESIGN-SYSTEM.md`** rather than shadcn defaults — this is a heritage clay-tile brand (warm terracotta/sand palette), not a generic SaaS look.
5. **Don't start a new build batch with less than ~20% context/budget remaining** if avoidable — stop cleanly at a batch boundary and log it in `00-PROGRESS.md` rather than leaving a batch half-done with no note.
6. If something in these docs conflicts with what Sylvester says in a live session, the live instruction wins — but note the conflict in `00-PROGRESS.md` so the docs get corrected too.

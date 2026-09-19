# 02 — Design System

## Palette — PAKCLAY.COM white / blue / slate-gray (2026-09-19 rebrand)

Replaced the warm terracotta / sand / espresso heritage palette (and the earlier dark-charcoal restyle) with a clean white, blue and slate-gray system. **Scope of the rebrand was colors, the logo wordmark text and the favicon only** — layout, copy and sections were not changed. The token *names* are unchanged (they are shadcn's slots plus a few storefront aliases), so components already followed the swap; only literal hex values and a few faded-primary hover patterns needed hand edits (listed below). Values live in `:root` in `khaprail-website/src/index.css`.

| Role (rebrand brief) | Token(s) in `index.css` | Value | Was |
|---|---|---|---|
| Main accent — buttons, links, active states | `--primary` (`--ring`, `--chart-1`, `--sidebar-primary`) | `#2563EB` | terracotta `#B5502B` |
| Hover / pressed | `--primary-dark` (`bg-primary-dark`) | `#1E4FA3` | darker terracotta |
| Page background | `--background`, `--card`, `--popover` | `#FFFFFF` | cream `#FAF6F0` |
| Card / section background | `--muted` (`--panel-warm`) | `#F8F9FB` | warm off-white `#F1E9DD` |
| Header / footer band | `--navy` (`--hero`, `--sidebar`) | `#1E293B` (dark slate) | espresso |
| Body text | `--foreground` | `#1E293B` | espresso `#3B2A20` |
| Muted text | `--muted-foreground` | `#64748B` | warm gray-brown |
| Border / input | `--border`, `--input` | `#E5E8EB` | tan `#E3D5C0` |
| Neutral badge ("Popular") | `--badge-neutral` / `--badge-neutral-foreground` (`--secondary` / `--secondary-foreground` carry the same pair) | `#E5E8EB` / `#334155` | — |
| Accent badge ("New") | `--badge-accent` / `--badge-accent-foreground` (`bg-badge-accent text-badge-accent-foreground`) | `#DBE8FF` / `#1E4FA3` | terracotta / navy fill |
| Solid accent surfaces (floating buttons, carousel arrows, menu-item hover) | `--accent` / `--accent-foreground` | `#2563EB` / `#FFFFFF` | clay orange `#C96A3D` |
| Text on the dark slate band (only) | `--primary-on-dark` (`text-primary-on-dark`) | `#60A5FA` | — |
| Alternating carousel panel | `--panel-navy` | `#EDF1F6` | sand `#E8DCC8` |
| Price text | `--price` → `var(--primary)` | `#2563EB` | clay orange |
| Admin sidebar chrome | `--sidebar*` | slate `#1E293B`, hover `#334155`, ring `#60A5FA` | espresso |

Because `--accent` now equals `--primary`, the alternating `bg-primary/15` / `bg-accent/15` tint on `CategoryBadgeCircle` no longer alternates (both are the same blue). That is deliberate: a lighter blue accent would drop white-on-accent below AA (3.68:1), which is the same failure the 2026-09-10 audit fixed on the "NEW" badge. Ask for a differentiated alternation if wanted.

### Usage rules (these come from the contrast measurements below)

- **`--muted-foreground` may only sit on `--background` / `--card` / `--muted`.** It is 3.87:1 on `--secondary` (`#E5E8EB`) and ~4.2:1 on `--panel-navy`, so no muted text directly on those; use `--foreground` or `--secondary-foreground` there.
- **Never use `--primary` as text on the dark slate band** (2.83:1). Use `--primary-on-dark`.
- **Hover/pressed on primary uses `--primary-dark`**, not `hover:bg-primary/80` (a faded blue under white text falls to ~3.9:1). `ui/button.tsx`, `ui/badge.tsx` and the product-rail arrows already do this.
- **No literal colors in components.** Every hex / `stone-*` / `slate-*` was replaced with a token (admin editors, filter bar). The only literals left in `src/` are the PDF palette below, which cannot read CSS variables, plus deliberate theme-agnostic scrims (`bg-black/*`).
- **`src/lib/pdf/brand.ts` duplicates four values** (`primary`, `foreground`, `muted`, `border`) for `@react-pdf/renderer`; keep it in sync with `:root`.
- Red (`--destructive`, `text-red-*`) and green (`text-green-600`) stay as semantic error / success colors, not brand colors.
- Use color sparingly for CTAs and badges — the product photography should carry most of the visual weight.

### Measured contrast (WCAG 2.x, computed 2026-09-19)

| Pair | Ratio | AA (4.5 text / 3 large) |
|---|---|---|
| `--foreground` on `--background` / on `--muted` | 14.63 / 13.89 | pass |
| `--muted-foreground` on `--background` / on `--muted` | 4.76 / 4.52 | pass |
| `--muted-foreground` on `--secondary` | 3.87 | **fail** (large text only) — see rules |
| white on `--primary` / on `--primary-dark` | 5.17 / 7.77 | pass |
| `--primary` text on `--background` / on `--muted` | 5.17 / 4.91 | pass |
| `--secondary-foreground` on `--secondary` | 8.42 | pass |
| `--badge-accent-foreground` on `--badge-accent` | 6.29 | pass |
| white on `--navy` (and at 70% / 60% opacity) | 14.63 (7.93 / 6.21) | pass |
| `--primary-on-dark` on `--navy` | 5.75 | pass |
| `--primary` on `--navy` | 2.83 | **fail** — never use |

Verified in the browser, not just from the table: a headless-Chrome audit walked every element on 12 storefront and admin screens (home, products with a filter open, PDP, categories, category, blog, blog post, about, chat widget open, mobile home, mobile menu, admin dashboard / products / product editor / blog editor) and (a) found **zero** warm terracotta / brown / cream computed colors (text, background, border, outline, SVG fill and stroke), and (b) measured real text contrast against the rendered background. The only sub-AA results left are disabled controls (exempt) and a screen-reader-only label. Hero text over the photo was measured on the actual pixels (heading ~9:1, paragraph ~8.8:1 at the 95th-percentile background).

### Logo and favicon

The wordmark is the text **PAKCLAY.COM** in the existing logo styling (`font-heading`, bold, `text-primary`) — navbar, mobile menu, footer, admin sidebar/login, PDF cover and spec-sheet brand line, and `SITE_NAME` in `hooks/use-document-head.ts` (page-title template `"<page> | PAKCLAY.COM"` and `og:site_name`). `index.html`'s fallback `<title>` is `PAKCLAY.COM`. Favicons live in `public/` (`favicon.svg`, `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `favicon-512x512.png`, `apple-touch-icon.png` at 180×180) and are linked from `index.html`. Body copy that names the manufacturer ("Khaprail Tiles has shaped clay roof tiles…"), product-line names and the chat assistant's wording were intentionally left as they were — see `00-PROGRESS.md`.

### History (superseded)

The palette went terracotta (original) → dark charcoal (2026-08-25) → terracotta again (2026-08-28) → white / blue / slate (2026-09-19). The value tables and revert notes that used to be here described the terracotta system and were removed; recover them with `git log -p 02-DESIGN-SYSTEM.md` if ever needed. Notes further down that quote old hex values (e.g. the batch-31 `--muted-foreground` darkening) are historical.

## Typography

**Current (2026-08-25 dark restyle):** Single type family site-wide: **Inter** (variable, self-hosted via `@fontsource-variable/inter`). No specific replacement typeface was named when the terracotta/Baloo 2 direction was superseded, so Inter was chosen as a clean, highly-legible default for the new dark e-commerce-style theme — swap `@fontsource-variable/inter` and the `--font-display` value in `src/index.css` if a different family is wanted. Same single-family/weight-hierarchy approach as before (no separate heading/body pairing).

### Type scale bump (2026-08-27)

Storefront text read too small/thin, so every prominent tier was bumped one Tailwind step up (font-weight unchanged — this stacks on top of the existing bold headings, it doesn't replace them). Admin (`/admin/*`) was deliberately left untouched, same "separate chrome" rule as every prior visual pass. Applied per-component (this codebase doesn't centralize heading sizes in one token — each page/section repeats its own `text-*` classes, same pattern the 2026-08-24 "heading size & weight pass" used), not via a Tailwind `--text-*` scale override, specifically so admin wouldn't inherit the bump too:

| Element | Was | Now |
|---|---|---|
| Page `<h1>` titles (Products, Categories, category name, blog post, etc.) | `text-5xl sm:text-6xl` | `text-6xl sm:text-7xl` |
| Section `<h2>` headings (rail titles, CTA banner, FAQ, "Explore Our Range") | `text-3xl sm:text-4xl` | `text-4xl sm:text-5xl` |
| Category-detail "Explore {category}" subcategory-row heading | `text-2xl` | `text-3xl` |
| PDP product name / price | `text-3xl` / `text-2xl` | `text-4xl` / `text-3xl` |
| Hero `<h1>` | `text-5xl sm:text-6xl lg:text-7xl`, `max-w-2xl` | `text-6xl sm:text-7xl lg:text-8xl`, `max-w-3xl` (widened so the bigger text doesn't over-wrap) — **superseded 2026-08-28**, see the "Hero size reduction" note below: stepped back down to `text-5xl sm:text-6xl lg:text-7xl` with `max-w-4xl` |
| Heritage banner heading | `text-4xl sm:text-5xl` | `text-5xl sm:text-6xl` |
| Navbar logo wordmark | `text-2xl` | `text-3xl` |
| Navbar nav-strip links/mega-menu trigger | `text-[0.9rem]` | `text-base` (tightened trigger/link `px`  and `NavigationMenuList` gap to keep it from wrapping at the `lg:` floor — verified clean at 1024px/1280px/1536px) |
| Mega-menu category-card / circular-badge labels | `text-xs`–`text-sm` | `text-sm`–`text-lg` depending on context |
| Primary CTA buttons ("Get a Sample," "Download Catalog/Spec Sheet," checkout-style banners) | `h-12 px-6 text-base` | `h-14 px-7 text-lg` |
| Header/mobile-nav "Get a Sample" | `h-10/h-11 text-sm/text-base` | `h-11/h-12 text-base/text-lg` |
| Product-card title, PDP "Product Details" prose, blog excerpt | `text-sm` (inherited) | `text-base` |

Verified: `npm run build`/`npm run lint` clean, no new warning categories. In-browser at 1024px/1280px/1536px desktop widths the navbar strip fits with room to spare, no wrap. Real mobile-viewport screenshot not captured — same recurring browser-automation-tool limitation noted throughout `00-PROGRESS.md`'s session log (window resize doesn't change the actual viewport in this environment); the responsive classes were verified by code inspection instead.

### Hero size reduction (2026-08-28)

The batch-17 bump made the Hero too dominant — a 4-line headline that pushed the CTAs below the fold. Stepped the whole block back down one notch (font-weight/copy/photo/CTA-behavior unchanged, sizing/spacing only):

| Hero element | Was (batch 17) | Now |
|---|---|---|
| Container padding | `py-24 lg:py-32` | `py-14 lg:py-20` |
| Content gap | `gap-6` | `gap-4` |
| Headline | `text-5xl sm:text-6xl lg:text-7xl`, `max-w-2xl` | `text-6xl sm:text-7xl lg:text-8xl`, `max-w-3xl` → **reverted to `text-5xl sm:text-6xl lg:text-7xl`, widened to `max-w-4xl`** (the wider `max-w` at the smaller font is what brings it to 3 lines instead of 4) |
| Subtext | `text-lg` | `text-xl` → **reverted to `text-lg`** |

CTA buttons (`h-14 px-7 text-lg`) and the eyebrow badge were left as-is — out of this pass's stated scope. Verified in-browser at 1536px and 1024px: headline wraps to 3 lines, the full hero block (badge through both CTAs) fits inside a single ~700px-tall viewport instead of needing a scroll.

~~Single type family site-wide: Baloo 2 (variable, weights 400–800), matching the real Khaprail logo wordmark...~~ — superseded; Baloo 2/Fredoka/Quicksand were all part of the earlier rounded-sans direction this restyle replaced.
- Generous line-height on body copy — this audience includes older, non-tech-fluent visitors researching a home-construction decision, not a fast tech audience

## Circular icon-badge component (2026-08-27, palette updated 2026-08-28)

`CategoryBadgeCircle` (`src/components/shared/category-badge-circle.tsx`) — an outlined Lucide icon centered in a soft-tinted circle, label rendered by the caller underneath (reference: a "Shop by Department"-style icon-badge row). Fill alternates between the two real accent colors at low opacity — `bg-primary/15` + `bg-accent/15` (both the same blue under the 2026-09-19 palette, so the tint no longer alternates; was terracotta/clay-orange before and navy-blue/gold under the earliest dark restyle) — instead of the old per-index rainbow placeholder palette (`category-fill-palette.ts`, removed); falls back to the real `cover_image_url` photo once a category actually has one (none do yet). The icon itself comes from `src/lib/category-icons.tsx`'s `getCategoryIcon(name)` — a keyword-matched Lucide mapping built against the real `12-CATEGORY-TAXONOMY.md` category/subcategory names (Kitchen → ChefHat, Bathroom → Bath, Outdoor → Sun, Pool → Waves, Terracotta/Clay → Flame, Concrete/Brick → Blocks, Mosaic → Grid3x3, Jali → Wind, Industrial → Warehouse, Stone → Mountain, Khaprail → Building2, Roof → Home, Floor → SquareStack, Wall → Grid2x2, default → LayoutGrid). No icon-per-category manifest existed anywhere in this codebase before this pass — this is a new mapping, not a reuse of an existing one, since the closest prior thing (`application-tags.tsx`) was deleted in batch 11.

Used by: the homepage's Featured Categories row (all root categories, right after the hero) and Trending Categories grid (`size="lg"`), and the category-detail page's "Explore {category}" subcategory row (e.g. Wall Tiles → Kitchen/Bathroom/Outdoor/Terracotta/Concrete/Mosaic Wall Tiles) — this last one is the closest real analog on this site to a "shop by space/application" row, since Khaprail's taxonomy models kitchen/bathroom/outdoor as subcategories rather than a separate top-level axis.

**Scrollbar (2026-08-28, refined same day):** the horizontal scroll containers on this row and on `ProductRail` used to show a persistent native scrollbar track below the content. First fix hid it outright (`scrollbar-hide`); refined same day into a hover-reveal treatment instead, since a fully-hidden scrollbar gives no affordance that a row is scrollable. Current utility is `scrollbar-fade` (`src/index.css`) — invisible at rest (`scrollbar-color`/`::-webkit-scrollbar-thumb` transparent), a thin (6px) low-contrast gray thumb fades in via `:hover`/`:active`/`:focus-within` on the scroll container. Applied to the same two spots (`category-icon-rail.tsx`, `product-rail.tsx` — the latter backs every homepage/PDP/category-page rail, so New Arrivals/Best Sellers/Top Picks Today/Similar Products/Explore More Products all inherit it). Scroll functionality (arrow buttons, touch/trackpad/keyboard) is unaffected, only the visual scrollbar chrome changes. Not applied to `compare-table.tsx`'s data table, which keeps its default visible scrollbar since that's a plain wide table, not a carousel.

## Shop by Category tabbed section (2026-09-10)

New homepage section (`src/components/home/shop-by-category-section.tsx`, not part of `10-HOMEPAGE-SPEC.md`'s confirmed section order — see `00-PROGRESS.md`): a centered "Shop by Category" heading/subheading, an accessible pill-style category tablist, and a `ProductRail` product carousel that refetches on tab change. Categories are admin-toggled via a new `categories.is_featured` boolean (checkbox added to the existing `/admin/categories/:id/edit` form, same pattern as `products.is_featured`) and only appear as a tab once they also have at least one real product — a tab never opens onto an empty carousel by construction, though the empty-state copy (`"More {Category} coming soon."`) still exists defensively in case a category's last product is deleted after the tab list loads.

Tabs reuse the shared Base UI `Tabs` primitive (`src/components/ui/tabs.tsx`, previously only used by the admin blog editor's Content/SEO/AEO-GEO/FAQ tabs) restyled into pills (`src/components/shared/category-tab-list.tsx`) — terracotta solid fill (`bg-primary`) for the active tab, neutral outline (`border-border bg-background`) for the rest — rather than a second hand-rolled tab implementation, so the whole site has one tested WAI-ARIA tablist behavior (role="tablist"/"tab", roving tabindex, arrow-key nav with `activateOnFocus` so arrow movement selects immediately). `ProductRail` gained an optional `title` (now omittable, for sections like this one that render their own heading separately) — no other call site was affected.

## Tiles for Every Space editorial section (2026-09-10)

New homepage section (`src/components/home/lifestyle-tiles-section.tsx`) — an admin-curated alternative to "Explore Our Range" (`CategoryShowcase`) that does the same "browse by space" job with hand-picked photography instead of data-driven category picks. Backed by a new `lifestyle_tiles` table (`image_url`/`image_alt_text`/`caption`/`link_url`/`sort_order`/`is_active`, public-read active-only + authenticated-manage RLS, same 3-policy shape as `blog_posts`) with a full `/admin/lifestyle-tiles` CRUD panel (list with thumbnail + inline activate/deactivate toggle, add/edit form). Kept deliberately visually distinct from Category Showcase despite the shared "N photo cards + caption" shape: heading sits above the framed panel here (Category Showcase's sits inside it), `4:5` portrait photos instead of `3:4`, and a `bg-muted` panel instead of `bg-panel-warm`. Column count matches the active tile count (1/2/3) rather than always reserving 3 slots, so a partially-filled admin list never leaves an empty grid gap; the whole section hides itself when zero tiles are active, same "honest data only" pattern as every other homepage section. Photos are `loading="lazy"` since they're large.

## Offers, Available Now section (2026-09-10)

New homepage section (`src/components/home/offers-section.tsx`, placed right after Featured Categories — early, conversion-focused positioning) modeled on a 4-card "end-of-year offers" reference, but **without percentage-off discounts** — Khaprail has no confirmed live promotion. Each card's `badge_value`/`badge_suffix`/`label` must describe a real, always-true capability instead (free samples, bulk pricing, delivery, new-customer welcome) — fully admin-editable via a new `offer_cards` table + `/admin/offer-cards` CRUD panel (same list/edit/toggle/delete shape as `lifestyle_tiles`) so real numbers can replace the placeholder wording the moment an actual promotion is confirmed, with zero code change. Card visual: `bg-navy` (dark espresso — `--navy` aliases `--foreground`) with a `bg-gradient-to-t from-navy via-navy/85 to-navy/20` wash over an image anchored at the bottom, big bold `text-accent` (terracotta) badge value + smaller badge suffix, label text, and an underlined `link_label` — only the link text is the click target here, unlike Lifestyle Tiles' whole-card links, matching the reference's "Shop now" text-link pattern. `link_url` accepts either an internal path (rendered as a router `Link`) or a full `https://` URL (rendered as an external `<a target="_blank">`) — needed because the seeded "Get a Sample" card links to a WhatsApp deep link (`buildWhatsAppUrl`'s exact message wording, reused from `hero.tsx`), not an internal route. Column count tracks the active-card count (1/2/3/4) same as Lifestyle Tiles; hides entirely at zero active cards.

Seeded 4 starting cards using real, already-uploaded category photography (no dedicated "offers" photography exists yet — swap via `/admin/offer-cards` once available, same as every other still-photo-less spot on the site). "Fast Delivery" and "New Customer" are deliberately vague, placeholder-flagged content (see the table's `comment on table` and the admin list page's on-page notice) — real delivery terms and a real new-customer discount, if either is ever confirmed, replace this wording via the admin form; if no new-customer offer is ever planned, deactivate that card instead of leaving invented terms live.

Like every other image field in this admin (`categories.cover_image_url`, `products.cover_image_url`), the image field is a plain "paste the Storage URL" text input, not a file-upload widget — no such uploader exists anywhere in this codebase (files still go up via the Supabase Dashboard, then the URL is pasted in). The request asked for "image upload reusing the existing uploader," which doesn't correspond to anything real here — mapped onto the established pattern instead; see `00-PROGRESS.md`.

## Trending in Tiles bento grid (2026-09-10)

New homepage section (`src/components/home/trending-tiles-section.tsx`) — a fixed 4-slot bento grid (`large` full-height left, `small_top_left`/`small_top_right` stacked top-right, `wide_bottom` spanning the bottom of the right column), backed by a new `trending_tiles` table (`grid_position`/`image_url`/`image_alt_text`/`show_new_badge`/`title`/`subtitle`/`link_url`/`is_active`, same public-read-active + authenticated-manage RLS shape as every other admin-curated table) with a `/admin/trending-tiles` CRUD panel (`grid_position` as a 4-option dropdown, not free text). No DB uniqueness constraint on `grid_position` — if two active tiles ever claim the same slot, `useTrendingTiles` picks the most recently updated one (documented on the table itself via `comment on table`).

Grid CSS: `grid-cols-1 lg:grid-cols-3` with **no `grid-rows-*` utility** — this was a real bug caught during QA, not a stylistic choice: `lg:grid-rows-2` forces two equal `1fr` row tracks, which stretches the small tiles' row to match the wide tile's taller row and leaves a visible empty gap under the small tiles. Removing it lets each row size to its own content (`aspect-[4/3]` on the two small tiles, `aspect-[2/1]` on `wide_bottom`), and the `large` tile (`row-span-2`, `aspect-auto` at `lg`) stretches across the combined natural height via the grid's default `align-items: stretch` — confirmed via a live `getComputedStyle` check (300px + 16px gap + 408px = 724px, matching exactly). Each tile is a whole-card `Link` (unlike Offers' text-only links) with a `group-hover:scale-105` image zoom (same treatment as Lifestyle Tiles), a `bg-accent` (terracotta, not the reference's blue) "NEW" pill top-left gated on `show_new_badge`, and a `bg-navy/80` caption bar (bold title + smaller subtitle, light text) anchored to the bottom via `absolute inset-x-0 bottom-0`.

Renders the full bento shape only when all 4 canonical positions have an active tile; with fewer, it falls back to a simple `grid-cols-1 sm:grid-cols-2` wrap of whatever exists (same "never leave a broken/empty layout" rule as every other partial-content homepage section) rather than trying to preserve the asymmetric shape with holes in it. Seeded 4 starting tiles using real, already-uploaded category photography (no dedicated "trending" photography exists yet, same gap as Offers/Lifestyle Tiles — swap via `/admin/trending-tiles` once available).

## Mobile navigation (2026-09-10)

A three-piece mobile-only pattern (below the `lg` breakpoint — desktop nav is completely untouched), ported from the sibling Artisan site with Khaprail-specific swaps:

**Bottom tab bar** (`src/components/nav/mobile-tab-bar.tsx`, rendered globally in `SiteLayout`) — fixed, `z-40`, `env(safe-area-inset-bottom)` padding. 5 items: Home (`/`), Filters (opens the filters drawer — see below), an elevated circular `bg-accent` "Get a Sample" WhatsApp button (raised above the row, same message/number as `hero.tsx`'s CTA), Catalog (links to `/downloads`, the existing "Download Full Catalog" page — no separate PDF-trigger logic was duplicated into the global layout), and Contact (links to `/contact`). Active tab is styled by matching `location.pathname`. Hides itself entirely (unmounts, doesn't just visually hide) whenever the category drawer or filters drawer is open, via a small shared `MobileDrawerProvider` context (`src/lib/mobile-drawer-context.tsx`) for the category drawer's open state, and a direct `location.hash` check for the filters drawer's. The existing `FloatingWhatsAppButton` (bottom-right bubble) is now `hidden lg:flex` — the tab bar's elevated CTA does that job on mobile, and the two would otherwise stack in the same corner.

**Category drawer** (hamburger menu, `src/components/nav/mobile-nav.tsx` — rewritten, not new) — header row is a close (X) + "Khaprail Tiles" wordmark; no search icon, since no real search feature exists anywhere on this site (per the standing "no dead/non-functional affordances" rule) and the request's own phrasing hedged this ("if search exists"). Below that: a flat, single-open accordion of all 15 real root categories (pulled live from `categories`, same as the desktop mega-menu — never hardcoded), each its own row with a `⌄` chevron. Single-open is enforced manually (`openCategoryId` state + a diff against the accordion's reported value array) since Base UI's `Accordion` value is natively multi-select. Only 2 of the 15 real root categories (Wall Tiles, Floor Tiles) have subcategories today — a leaf root category (the other 13) skips the accordion entirely and navigates straight to its listing on tap, since expanding onto an empty panel would be a dead interaction. Below the category list: a visually distinct `bg-secondary` "Download Catalogue" promo row (links to `/downloads`) and a plain "Blog" row last, per spec — the drawer no longer dumps the full `NAV_LINKS` list (Products/New Arrivals/Best Sellers/Videos/Downloads/Contact) the way it used to, since the bottom tab bar and this drawer's own promo row now cover most of that ground; the existing "Get a Sample" WhatsApp button stays at the bottom of the drawer since the tab bar's equivalent is hidden while this drawer is open.

**Filters drawer** (`src/components/products/mobile-filters-drawer.tsx`, mounted on `/products` only — "the main tiles listing," not category pages) — a two-pane master-detail drill-down, deliberately distinct from the category drawer's accordion: a `FILTERS` header, a ~35%-width left column of facet types (Color/Material/Size/Shape/Roof — same admin-editable `filter_types` data and `orderFilterTypes()`/`filterTypeLabel()` ordering the desktop `FilterBar` uses, extracted into `lib/product-filters.ts` so the two surfaces can't drift), and a ~65%-width scrollable right column of that facet's values with a badge count on the left row when any are active. Fully wired to the same `activeFilters`/`onToggle`/`onClearAll` as the desktop bar — same URL-reflected filter state, not a second filtering mechanism. The desktop chip-row `FilterBar` is hidden on mobile (`hidden lg:block`) so the two UIs don't stack.

The drawer's open/closed state is the `#mobile-filters` URL hash, not a query param — `parseFiltersFromSearchParams` (`lib/product-filters.ts`) treats every query key except `sort` as a real filter type, so a `?mfilters=1` param would have been misread as an attribute filter and silently broken the product query. **Found and fixed a real bug during QA**: `handleToggle`/`handleClearAll`/`handleSortChange` originally called `useSearchParams`'s setter, which drops the URL hash entirely — meaning every single tap on a filter value inside the drawer closed it immediately (`mobileFiltersOpen` is derived from `location.hash`). Fixed by replacing the setter with a custom `applySearchParams()` that calls `navigate()` directly, explicitly preserving `location.hash` on every update. Also found (via a live console-error check, not just visual QA) that 3 `SheetClose` usages had `nativeButton={false}` while wrapping an actual `<Button>` (a native `<button>`) instead of a `Link` — that flag is only correct for non-button render targets (per the `nativeButton` rule established back in batch 2); removed it from those 3 spots.

## AI chatbot + cached product summaries (2026-09-10)

Two features sharing one backend proxy (`khaprail-website/server/routes/ai-chat.ts`, an Express route on the self-hosted Node server — never called directly from the browser; `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are server-only env vars). Full architecture/security detail is in `00-PROGRESS.md`'s AI chatbot batch entry — this section is the UI/visual summary.

**Cached PDP summary** (`src/components/pdp/ai-summary-card.tsx`) — a `bg-muted/50` bordered card with a small `SparklesIcon` + "AI-GENERATED SUMMARY" uppercase label above the text, so visitors never mistake it for official manufacturer copy. Reads `products.ai_summary` directly (no live call on page load); renders nothing at all when that column is null — no broken/empty-state card. Placed on the PDP right after the "About This Item" accordion. Generated once via a "Generate AI Summary" button on the admin product editor (never on a plain form save) — that button and a "Last generated" timestamp live in their own bordered section, separate from the regular product fields, so it's visually clear this is a distinct, deliberate action.

**Chat widget** (`src/components/shared/ai-chat-widget.tsx`, mounted globally in `SiteLayout`, every page) — **superseded 2026-09-10 (batch 29)**, see `00-PROGRESS.md`: rebuilt from the small popover described in the paragraph this replaces into a real shopping-assistant panel (near-full-screen mobile bottom sheet / `420px` desktop panel anchored bottom-right) with real `search_products` tool-use — the model returns tappable product cards built from actual Supabase rows, never invented text. Trigger button is a `bg-primary` circle + sparkle mark, bottom-**right** — **repositioned 2026-09-10 (batch 34)**: originally bottom-left, moved to stack directly above the desktop floating WhatsApp button (same corner, `lg:bottom` computed as the WhatsApp button's own offset + its height + a small gap, so they never overlap at any viewport height) rather than sitting opposite it — with a gentle `chat-pulse-ring` CSS pulse (respects `prefers-reduced-motion`) and a one-time-per-session "Need help finding a tile?" greeting bubble (tail/dismiss-corner flipped to match the right-aligned anchor). Panel header: brand-mark avatar + title, reset icon, close icon, "Today" divider. Quick-refine chips read the real (currently empty) `filter_types` table — honestly absent until Sylvester adds real values, not faked.

**Second entry point — navbar icon (2026-09-10)** — the floating bottom-right trigger above is additive, not the only way in: a small `bg-primary` circle + `SparklesIcon` button (same brand-mark treatment as the trigger/PDP AI-summary tag) now sits in the desktop navy nav strip right after `SiteSearch` (`src/components/layout/site-header.tsx`), and in the mobile category drawer's header row right after its search icon (`src/components/nav/mobile-nav.tsx` — opening it also closes the drawer first, so the two sheet-style surfaces never stack). Both call `open()` from a new shared `ChatPanelProvider`/`useChatPanel()` context (`src/lib/chat-panel-context.tsx`, mounted in `SiteLayout` alongside `MobileDrawerProvider`) — `AiChatWidget` reads its `isOpen`/`open`/`close` from that context instead of owning local state, so every entry point toggles the exact same panel instance and in-progress conversation, never a second chat. `aria-label="Ask the AI assistant"` on both buttons.

## Site-wide search (2026-09-10, batch 30)

Real search against the `products`/`categories` tables (name/category name, case-insensitive partial match) — never a fuzzy/fake "search" over hardcoded data. One shared query helper (`src/lib/product-search.ts`) backs three surfaces so they can't drift:

**Desktop navbar pill** (`src/components/nav/site-search.tsx`, in the navy sub-nav strip, pushed right via `ml-auto`) — a real, always-present `<input>` styled as a pill (`rounded-full border border-navy-foreground/25 bg-navy-foreground/10`, matching the tab-pill treatment used elsewhere), not a separate collapsed/expanded toggle — `focus-within:` styling alone gives it the "activates on interaction" look. Debounced 300ms (`src/hooks/use-product-search.ts`), results in a `role="listbox"`/`role="option"` popup (thumbnail, name, category, price — price omitted when null, never fabricated), capped at 6, with a "View all results" row always below. Full keyboard support: arrow keys move through results + the "View all" row, Enter activates, Escape closes.

**Mobile drawer search** (`src/components/nav/mobile-nav.tsx`) — the category drawer header's search icon swaps the category list for a full-width search sub-view (back arrow + input + same debounced result rows), not a separate modal.

**`/search?q=...`** (`src/pages/search-results.tsx`) — reuses the exact same grid/card/filter-bar/pagination stack as `/products` (`useProducts` gained an optional `searchQuery` param, intersected with any active filters via the same id-set approach the attribute-filter logic already used — not a second competing query path). Empty-query and no-results states both render real copy + a link back to `/products`, never a blank page.

## Audit-fix batch (2026-09-10, batch 31) — accessibility/honesty corrections

> Historical: the hex values and the `bg-navy` NEW-badge treatment quoted in this section describe the pre-2026-09-19 terracotta palette. Current values and rules are in the Palette section at the top.

Fixes for the confirmed findings in `UX_AUDIT_REPORT.md`. Full detail in `00-PROGRESS.md`'s batch 31 entry — this is the token/visual summary.

- **`--muted-foreground` darkened** `#7A6A58` → `#746554`. The old value read 4.33:1 on full-opacity `--muted` panels (fails WCAG AA normal text); the new one clears 4.67:1. The `bg-muted/50` usage elsewhere (PDP AI-summary card, blending toward the lighter page background) was already passing and only gets more margin.
- **"NEW" badge on the "Trending in Tiles" bento grid** (`trending-tiles-section.tsx`) swapped from `bg-accent`/`text-accent-foreground` (3.47:1, fails AA) to `bg-navy`/`text-navy-foreground` (12.67:1) — the same high-contrast treatment the "New Arrival" (`ProductCard`) and Trending Categories "NEW" badges already use, so all three now read as one consistent badge style instead of three variants.
- **Icon-only `Button` size variants** `icon` (was 32px) and `icon-lg` (was 36px) bumped to 44px/48px (`button.tsx`) to clear the WCAG 2.5.5 touch-target minimum — the icon glyph itself is untouched (still the default 16px), only the surrounding hit-area grew. The AI chat panel's reset/close icons (plain buttons, not built on this variant) and the mobile category drawer's close/search/chat icons got the same treatment directly.
- **Category tiles with no `cover_image_url`** (`category-tile.tsx`, used by the mega-menu and `/categories`) now fall back to the same icon system `CategoryBadgeCircle` already uses (`getCategoryIcon`) instead of rendering an empty box — 26 of 29 live categories hit this path.
- **Admin Sign Out button** (`admin-layout.tsx`) — the shared `outline` Button variant sets a light `bg-background` with no explicit text color, so inside the dark sidebar it inherited cream `text-sidebar-foreground` (cream-on-cream, ~1:1). Added `text-foreground` on this one instance only; the shared variant is untouched everywhere else.
- **`categories.is_trending`** (new column, admin-editable via `/admin/categories`) replaces `trending-categories-grid.tsx`'s old `getRootCategories(categories).slice(3, 7)` positional slice. A category only renders here once it's both flagged trending *and* has real products (directly or via a subcategory — same rolled-up-to-root count `CategoryShowcase` already uses), so it can never link to a dead "coming soon" page. Nothing is flagged yet — real curation is Sylvester's call, not something to fabricate — so the section honestly hides itself for now, same pattern as every other data-driven homepage section.
- **`products.is_new`** (new nullable column, tri-state: `true` always shows "New Arrival", `false` always hides it, `null` falls back to the existing `created_at`-window heuristic) — the admin editor's "Featured" checkbox now has a "New Arrival" sibling. All 17 existing (bulk-inserted-in-one-session) products were explicitly backfilled to `false`, since the date-window badge had no real signal value across a catalog that old with a single insert timestamp.
- **`filter_types` seeded from real product data** — checked every product row first: `finish`/`size` are null on all 17 (not seeded, no real data to back a chip), `brand`/`country_of_origin` are real non-null values on all 17 (seeded as "Brand"/"Origin" facets, backed by real `product_attributes` rows so every chip has real matching results). Both currently match 100% of products since the catalog has no variation there yet — honest, not fabricated, but not very discriminating until real variation exists.
- **Category cover images** (`category-tile.tsx`, `category-badge-circle.tsx`, `category-showcase.tsx`, `feature-row.tsx`) now set explicit `width`/`height` on the `<img>` (matching each container's own aspect ratio, not the source file's real dimensions) so the browser reserves layout space before load — several live category photos are 2MB+ unoptimized PNGs. The files themselves (`wall-tiles.png.png` 2061KB, `roof-tiles.png.png` 2246KB) still need re-export/compression — a content decision, not made here.
- **Storage URL paste fields** (every `cover_image_url`/`image_url` admin input — products, categories, blog posts, lifestyle tiles, offer cards, trending tiles) now strip a duplicated trailing extension (`*.png.png` → `*.png`) at save time via `stripDuplicatedExtension()` (`lib/utils.ts`). Existing already-uploaded files were left as-is — renaming them means re-pointing live DB references, a separate deliberate pass.
- **Scroll position** now resets to the top on every route change — `src/components/layout/scroll-to-top.tsx`, mounted once inside `<BrowserRouter>`. This app uses the plain `<BrowserRouter>` API, not React Router's data-router APIs, so `<ScrollRestoration>` isn't available; this is the manual equivalent, scoped to pathname changes only (in-page filter/sort query-string changes don't yank scroll position).
- **Featured Categories icon rail and the 3-image Feature Row** ("Shop Wall/Floor/Roof Tiles") both gained a real `<h2>` ("Featured Categories" / "Popular Categories") — previously the only two homepage sections with no heading element at all, skipping both for screen-reader users navigating by heading.
- **AI chat input placeholder** restored to page-context-aware copy ("Ask about this product…" on a PDP, "Ask about tiles..." elsewhere) — regressed to a static string during the batch-29 panel rebuild.

## Spacing / layout

- Generous whitespace around product photography — don't crowd tile images, they need to read clearly at a glance
- 12-column grid, standard Tailwind spacing scale

## HCI & psychological principles to apply (not just decoration)

- **Hick's Law:** the real catalog has 25+ product types — never present them as one flat list. Group into visual collections (see 03-MEGA-MENU-SPEC.md).
- **Recognition over recall:** every filter, swatch, and menu item shows a photo, not just a name.
- **Fitts's Law:** primary CTAs ("Get a Sample," "Download Catalog," "WhatsApp Us") large and thumb-reachable — assume majority mobile traffic from Pakistan.
- **Von Restorff / isolation effect:** New Arrivals and Best Sellers get a visually distinct badge/card treatment, not just another grid row.
- **Progressive disclosure:** PDP shows essentials above the fold; specs/application info in an expandable accordion.
- **Provenance/trust signals:** "Since 1982" and craftsmanship story woven into the homepage hero and PDP, not buried only in About Us.
- **Honest data only:** no fabricated social proof. Real Supabase-backed counts, or nothing.

## Motion

- Framer Motion for micro-interactions (mega-menu card hover/lift, page transitions)
- Keep motion subtle and fast (150–250ms) — this should read as polished, not gimmicky

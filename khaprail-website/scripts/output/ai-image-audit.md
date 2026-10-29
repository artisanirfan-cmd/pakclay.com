# AI / placeholder image audit — public site (batch 54, 2026-10-30)

Read-only audit. Nothing was changed while producing it.

How each image was judged:
- **Provenance in the repo.** Source comments in `src/lib/*-image.ts` and 00-PROGRESS.md entries.
- **Pixel dimensions and metadata.** 864×1184, 1448×1086, 1536×2752 and 1024×1536 are fixed output sizes of common image generators. A real camera or phone photo almost never lands on them, and these files carry no camera EXIF at all.
- **Looking at every file.**

Storage base: `https://rnmkbiweqjdgdmqavaso.supabase.co/storage/v1/object/public/`. URLs below are relative to it.

## A. Confident: AI-generated (proposed for replacement)

| # | Location (table / row or file) | Current URL | Judgement | Reason |
|---|---|---|---|---|
| A1 | `lifestyle_tiles` "Courtyard & Flooring" (`47eb60f6…`) | `Lifestyle%20Tile/Courtyard%20&%20Flooring.jfif` | AI-generated | 1536×2752 generator size, no EXIF, 3.3 MB. Over-perfect cinematic haveli courtyard with charpai. |
| A2 | `lifestyle_tiles` "Kitchen & Bathroom" (`d6b40517…`) | `Lifestyle%20Tile/Kitchen%20&%20Bathroom.jfif` | AI-generated | Same 1536×2752 size and batch upload. Staged rustic kitchen with typical AI prop styling. |
| A3 | `lifestyle_tiles` "Rooftop & Exterior" (`56e4e5d1…`) | `Lifestyle%20Tile/Rooftop%20&%20Exterior.jfif` | AI-generated | Same 1536×2752 size. Badshahi-style skyline at sunset with an impossible-looking haze. |
| A4 | `categories.floor-tiles.cover_image_url`, `offer_cards` "Bulk Pricing" (`4aa1cca0…`), `trending_tiles` wide_bottom (`1b07aca2…`) | `category-images/floor-tiles-showcase.jpg.jpg` | AI-generated | 864×1184 generator size, JFIF with no EXIF. Rendered arched corridor. |
| A5 | `offer_cards` "Free Sample" (`9bf1439f…`) | `category-images/khaprail-tiles.jpg.jpg` | AI-generated | 864×1184. Stack of shallow-focus "tiles" with melted edges. |
| A6 | `offer_cards` "Welcome Offer" (`a0f868c0…`), `trending_tiles` small_top_right (`5accda3c…`) | `category-images/mosaic-tiles.jpg.jpg` | AI-generated | 864×1184. Organic, non-repeating "mosaic" that no real tile mould produces. |
| A7 | `offer_cards` "Fast Delivery" (`6c7bfdde…`), `trending_tiles` large (`ac629641…`) | `category-images/roof-tiles.png.png` | AI-generated | 1448×1086 PNG with no metadata (generator size). Rooftop with painterly sky. |
| A8 | `categories.wall-tiles.cover_image_url`, `trending_tiles` small_top_left (`296b145f…`) | `category-images/wall-tiles.png.png` | AI-generated | 1448×1086 PNG with no metadata. Glossy tile wall with soft synthetic light. |
| A9 | *(not referenced by any row; not shown on the site)* | `category-images/floor-tiles.png.png` | AI-generated | 1448×1086 PNG, same set as A7/A8. Listed for completeness. Nothing to replace, so it stays in the bucket untouched. |

## B. Confident: stock placeholder (proposed for replacement)

| # | Location | Current file | Judgement | Reason |
|---|---|---|---|---|
| B1 | Homepage hero: `src/assets/hero-{640,960,1600}.webp`, `hero-1280.jpg` (via `src/lib/hero-image.ts`) | Pexels #17680685, "Ceramic Roof Tiles" | Stock placeholder | Documented as a PLACEHOLDER in `hero-image.ts` and the 2026-08-24 log. Real photo, but not Pak Clay's. |
| B2 | Homepage "Heritage" section: `src/assets/heritage-{640,960,1600}.webp`, `heritage-1280.jpg` | Pexels #15562216, "Tiles on Roof" | Stock placeholder | Documented as a PLACEHOLDER in `heritage-image.ts`. |

`hero-placeholder.*` and `heritage-placeholder.*` in `src/assets` are the untouched 1600px originals. They aren't imported anywhere, so they don't ship.

## C. Unsure: needs your call (NOT included in the replacement run)

These are **product** images that admins uploaded. They are outside the section list in the brief, and some may be the real product.

| # | Location | Current URL | Judgement | Reason |
|---|---|---|---|---|
| C1 | `products.square-6x6-inch-tiles` cover | `product-images/b5f8a693-71c0-46f0-8a13-73d44c735e80.png` | Probably AI | 1024×1536 PNG (the GPT-image portrait size), no metadata. The kitchen scene itself looks photographic, so I'm not certain. |
| C2 | `products.9x3-inch-terracotta-tiles` cover (its only image) | `product-images/716b84d4-ef5e-426d-8b6a-bfea4f70f36c.png` | Probably AI / 3D render | 1539×1022 PNG, no metadata. The brick-wall living room has render-like lighting and too-clean geometry. |
| C3 | `products.french-green-glazed-khaprail-tiles` cover | `product-images/4568f52b-ee0d-4293-89d6-1c9629923bf0.png` | Unsure | 1529×1029 PNG close-up of green glazed tiles. It could be a real product shot or generated. |
| C4 | `product_images` for `french-green-glazed-khaprail-tiles` | `product-images/05528a1e-102a-4f90-9c58-a7ced7752990.jfif` | Stock / web photo | A real photo, but it looks like a stone-coated *metal* roof, not clay. |
| C5 | `product_images` for `french-natural-red-khaprail-tiles` | `product-images/6f235f26-3770-413a-8928-8452cc01268c.png` | Stock / web photo | A real photo of a US-style garage, probably downloaded. |
| C6 | `blog_posts` "what-is-a-clay-tile…" cover | `product-images/f9191775-a19e-47c9-b8b7-8657c939fcc6.jpg` | Stock / web photo (real) | Not AI. It's a public-washroom urinal photo, which is an odd cover for this post. |

## D. Checked: real photos, no action

- **11 Featured-Category covers** at `category-images/<slug>.jpg` (bathroom, brick, khaprail, kitchen, mosaic, outdoor, pool, roof, stone, terracotta-jali, terracotta-tiles). Supplied 2026-10-14. All are photographic.
- **`category-images/pool-tiles-featured.jpg`.** A real photo (it matches the Pool 001 source photo). No longer referenced.
- **All 164 `product-images/products/<slug>/…` files from batch 53, plus the batch 42/51 product folders.** Real photos. Task 2 covers the logo/watermark issues in them.
- **`public/logo.png` and the favicons.** These are brand artwork, not photos.
- **`videos` table.** Empty.

## Proposed replacements (dry run only, awaiting approval)

The source folder has **no roof / Khaprail photos** (its groups are bathroom/floor/outdoor/jali/marble/granite/stone/pool). The roof-themed slots therefore get the closest real match. One slot instead reuses an existing real roof cover. Full plan: `scripts/ai-image-replacements.plan.json`.

| Slot | Proposed photo (manifest #) | Notes |
|---|---|---|
| A1 Courtyard & Flooring (4:5) | #73: terracotta garden path, clay-roof building behind | 1428×1500 → 760×950 |
| A2 Kitchen & Bathroom (4:5) | #28: terracotta kitchen floor with island | 800×600 → 480×600 crop |
| A3 Rooftop & Exterior (4:5) | #83: terracotta-tiled terrace | 990×660 → 528×660 crop |
| A4 Floor Tiles cover + Bulk Pricing + Flooring Essentials | #30: terracotta living-room floor | 800×600 |
| A5 Free Sample | #85: a single natural terracotta tile | 768×768 |
| A6 Welcome Offer + Decorative & Mosaic | #1: green glazed hexagon mosaic | 960×960 |
| A7a Fast Delivery | #81: large terracotta-tiled terrace | 715×607 |
| A7b Rooftop Restorations (links `/categories/roof-tiles`) | **reuse** `category-images/roof-tiles.jpg` (real, already live) | No roof photo exists in the source folder |
| A8 Wall Tiles cover + Bath & Wet Area | #12: teal glazed bathroom wall | 1080×799 |
| B1 Hero | #77: laid natural terracotta squares, as a texture shot | 2272×1704 → 3:2 crop, 640/960/1600 WebP + 1280 JPG |
| B2 Heritage | #89: cement-jali factory yard (real Pakistani works) | **Unsure.** The products are cement, not clay, and there is Urdu shop signage in the background. |

None of the proposed photos are among the excluded logo/watermark rows (92, 93, 101, 104, 124, 138, 146, 154, 168, 170–172) or #11.

## Update after approval (2026-10-30)

- Applied: A1–A8 and B1 (hero). B2 heritage was declined, so the Pexels placeholder stays.
- **C1/C2 correction:** these are not wholly AI-generated. The product's original import in storage is the same photo carrying a **KAMSTAR** watermark; the cover is that photo with the watermark edited out.
  - C1 `square-6x6-inch-tiles`: the cover is now its first gallery photo.
  - C2 `9x3-inch-terracotta-tiles`: **unchanged.** There is no gallery photo, and the only real photo shows the KAMSTAR logo.
- C3 and C6 are unchanged. C4 and C5 are hidden (moved to `product_images_hidden`; the Storage objects are kept).
- Details are in 00-PROGRESS.md batch 54.

# 12 — Category Taxonomy (Final)

Superseding all earlier drafts (2:37 AM / 3:22 AM voice notes) — this is the confirmed final list.

`[Bracket]` = main category. `(Parens)` = subcategory nested under the nearest main category.

## Main categories (15)

1. Wall Tiles — has subcategories, see below
2. Floor Tiles — has subcategories, see below
3. Roof Tiles — flat, no subcategories yet
4. Khaprail Tiles — flat, no subcategories yet
5. Outdoor Tiles — flat, no subcategories yet
6. Kitchen Tiles — flat, no subcategories yet
7. Bathroom Tiles — flat, no subcategories yet
8. Terracotta Jali — flat, no subcategories yet
9. Pool Tiles — flat, no subcategories yet
10. Industrial Tiles — flat, no subcategories yet
11. Brick Tiles — flat, no subcategories yet
12. Clay Tiles — flat, no subcategories yet
13. Stone Tiles — flat, no subcategories yet
14. Mosaic Tiles — flat, no subcategories yet
15. Terracotta Tiles — flat, no subcategories yet

## Subcategories

**Wall Tiles →** Kitchen Wall Tiles, Bathroom Wall Tiles, Outdoor Wall Tiles, Terracotta Wall Tiles, Concrete Wall Tiles, Mosaic Wall Tiles
  - **Kitchen Wall Tiles →** further split by material: Concrete, Terracotta, Ceramic

**Floor Tiles →** Kitchen Floor Tiles, Outdoor Floor Tiles, Bathroom Floor Tiles, Terracotta Floor Tiles, Concrete Floor Tiles

## Data model note

Modeled as a self-referencing `categories` table (id, name, slug, parent_id, cover_image_url, sort_order, created_at) so depth isn't hardcoded — this also lets flat categories above gain subcategories later without a schema change, just new rows.

```
categories (id, name, slug, parent_id NULL, cover_image_url, sort_order, created_at)
```

## Open item

The 11 flat categories above have no subcategories defined yet. Confirm with Sylvester whether they stay flat permanently, or whether subcategories are still to come for some of them (e.g. Roof Tiles, Khaprail Tiles) — don't assume either way when building out those category pages; build the flat version now, structure supports adding children later without rework.

## Implementation note (2026-08-25)

This taxonomy replaced the old flat `collections` table (Khaprail Roof Tiles, Multani Tiles, Terracotta Floor Tiles, Wall Tiles, Outdoor Tiles + 4 secondary lines — Grass Pavers/Fire Bricks/Blue Pottery/Wood-Fired Pizza Oven Bricks). Per Sylvester's decision: routes/nav/copy fully renamed from "Collections" to "Categories" everywhere, and the 4 secondary lines were dropped entirely (no products were assigned to them). The 17 real products were migrated onto the new `category_id`:

- Khaprail Roof Tiles (7 products: Barrel/Disco/Flat/French/Murlee/Spanish/Italian Taylor) → **Khaprail Tiles**
- Terracotta Floor Tiles (8 products) → **Floor Tiles → Terracotta Floor Tiles** (exact match)
- Multani Tiles (1×1, Penny Round — 2 products) → **Mosaic Tiles** — the one genuinely ambiguous mapping (no "Multani Tiles" analog exists in the new 15); flagging in case Sylvester wants these two reassigned elsewhere.

All 29 rows (15 main + 14 subcategory) are seeded with `cover_image_url` left `null` — no photography yet, same honest-empty pattern as every other table.

## Linking rule for empty categories (2026-09-20)

A category with no products anywhere in its subtree is `noindex`, left out of the sitemap, and NOT linked from navigation, footer, homepage rails, the /categories grid or subcategory lists (`useLinkableCategories`). It stays reachable by URL and editable in the admin, and appears in every list automatically as soon as a product is added to it or to a descendant. Admin-entered tile links into an empty category fall back to /categories (`resolveCategoryLink`).

## Live tree vs this doc + 2026-10-21 import (needs Sylvester's decisions)

The live `categories` table has grown past the list above. **Live, before 2026-10-21:** Wall Tiles › **Living Room Wall Tiles** (Granite / Marble / Stone / Terracotta children), Wall Tiles › Kitchen Wall Tiles › Concrete / Terracotta / Ceramic, and Wall Tiles › Bathroom / Outdoor Wall Tiles each › Terracotta. There are also three admin-made children under Terracotta Tiles whose names and slugs don't match (e.g. "Terracotta Roof Tiles" = `terracotta-floor-tile`).

**Added 2026-10-21** by `khaprail-website/scripts/import-pakclay-new-images.mjs` (17 rows, 74 products; see 00-PROGRESS.md batch 53):

```
Wall Tiles
  Bathroom Wall Tiles › Mosaic Bathroom Wall Tiles            (new)
  Outdoor Wall Tiles › Granite / Marble / Stone Outdoor Wall Tiles   (new; Granite + Marble empty, see 4)
  Jali Wall Tiles (new) › Cement Jali (new)
Floor Tiles
  Bathroom Floor Tiles › Mosaic / Terracotta Bathroom Floor Tiles    (new)
  Kitchen Floor Tiles › Terracotta Kitchen Floor Tiles               (new)
  Living Room Floor Tiles (new) › Terracotta Living Room Floor Tiles (new)
  Outdoor Floor Tiles › Concrete Outdoor Floor Tiles (new) › Otti Tiles / Pavers Tiles (new)
  Outdoor Floor Tiles › Terracotta Outdoor Floor Tiles               (new)
Pool Tiles › Swimming Pool Tiles                                     (new)
```

The source folders' extra levels were flattened. "Tuff Tiles" (above Otti/Pavers) is now a `type = tuff-tile` product attribute, and "Pool Wall and Floor Tiles" was dropped.

**Open decisions:**
1. **Living Room Floor Tiles** is not in this taxonomy. Keep it, or fold its 2 products into Terracotta Floor Tiles?
2. **Jali:** the 17 Terracotta Jali products went into the existing top-level **Terracotta Jali** category, not a new duplicate under Jali Wall Tiles. To nest it, set its `parent_id` to `jali-wall-tiles`. It then leaves the top-level menu and Featured Categories.
3. **Concrete Outdoor Floor Tiles** (new) vs the existing, still-empty **Floor Tiles › Concrete Floor Tiles**. Keep both, or merge?
4. **Granite/Marble/Stone:** under Outdoor Wall Tiles (as built), under Living Room Wall Tiles (where the live granite/marble products already sit; their photos are byte-identical to the new "outdoor" folders), or under main Stone Tiles?

Everything here is an ordinary row: moving a category is one `parent_id` change in `/admin/categories`, and moving a product is its category dropdown. Empty categories stay hidden (linking rule above). Once decided, fold the result into the main lists at the top of this doc.

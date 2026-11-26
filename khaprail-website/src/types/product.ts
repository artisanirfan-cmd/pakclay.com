// Mirrors the `products` / `product_attributes` tables (05-PDP-SPEC.md,
// 11-CATEGORY-LISTING-SPEC.md).
export interface Product {
  id: string
  name: string
  slug: string
  category_id: string | null
  size: string | null
  cover_image_url: string | null
  is_featured: boolean
  /**
   * Admin-toggled manual override for the "New Arrival" badge — `true`
   * always shows it, `false` always hides it, `null` (unset) falls back to
   * the `created_at`-window heuristic. See `ProductCard`.
   */
  is_new: boolean | null
  price: number | null
  created_at: string
}

// Mirrors the `filter_types` table sketched in 04-PRODUCT-LISTING-FILTERS.md.
export interface FilterType {
  id: string
  filter_type: string
  value: string
  display_order: number
}

export interface ProductImage {
  id: string
  image_url: string
  sort_order: number
}

export interface ProductAttributeRow {
  id: string
  attribute_type: string
  value: string
}

// Full PDP data — gallery, spec block, plus everything the listing card
// already needs. `product_variants`/application-attribute "Suitability"
// tags were removed per the PDP simplification pass — see 05-PDP-SPEC.md.
export interface ProductDetail {
  id: string
  name: string
  slug: string
  category_id: string | null
  category_name: string | null
  description: string | null
  size: string | null
  thickness: string | null
  finish: string | null
  country_of_origin: string
  cover_image_url: string | null
  is_featured: boolean
  created_at: string
  brand: string | null
  merchant: string | null
  sku: string | null
  availability: string | null
  manufacturer: string | null
  price: number | null
  ai_summary: string | null
  ai_summary_generated_at: string | null
  product_images: ProductImage[]
  product_attributes: ProductAttributeRow[]
  /** SEO fields (scripts/sql/2026-11-27-product-seo.sql). Absent until the migration runs. */
  seo?: ProductSeo | null
}

export interface ProductSeo {
  seo_title: string | null
  meta_description: string | null
  faqs: { q: string; a: string }[] | null
  image_alt: string | null
}

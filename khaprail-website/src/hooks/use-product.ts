import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { ProductDetail, ProductSeo } from "@/types/product"

interface UseProductResult {
  product: ProductDetail | null
  isLoading: boolean
  /** Set when Supabase isn't provisioned yet, the query failed, or no row matched the slug. */
  error: string | null
}

const PRODUCT_DETAIL_COLUMNS = `
  id, name, slug, category_id, description, size, thickness, finish,
  country_of_origin, cover_image_url, is_featured, created_at,
  brand, merchant, sku, availability, manufacturer, price,
  ai_summary, ai_summary_generated_at,
  categories ( name ),
  product_images ( id, image_url, sort_order ),
  product_attributes ( id, attribute_type, value )
`

/**
 * Reads a single `products` row by slug, embedding its images/attributes in
 * one request via PostgREST's FK-based resource embedding (05-PDP-SPEC.md).
 */
export function useProduct(slug: string | undefined): UseProductResult {
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [isLoading, setIsLoading] = useState(() => supabase !== null && !!slug)
  const [error, setError] = useState<string | null>(() =>
    supabase ? null : "Supabase project not configured yet"
  )

  useEffect(() => {
    if (!supabase || !slug) return

    let cancelled = false
    setIsLoading(true)
    setError(null)

    supabase
      .from("products")
      .select(PRODUCT_DETAIL_COLUMNS)
      .eq("slug", slug)
      .order("sort_order", { referencedTable: "product_images", ascending: true })
      .maybeSingle()
      .then(async ({ data, error: queryError }) => {
        if (cancelled) return
        if (queryError) {
          setError(queryError.message)
        } else if (!data) {
          setError("Product not found")
        } else {
          const { categories, ...rest } = data as unknown as ProductDetail & { categories: { name: string } | null }
          // SEO columns are read separately so the page still works before
          // scripts/sql/2026-11-27-product-seo.sql has run (the query just errors).
          let seo: ProductSeo | null = null
          if (supabase) {
            const seoRes = await supabase
              .from("products")
              .select("seo_title, meta_description, faqs, image_alt")
              .eq("id", rest.id)
              .maybeSingle()
            if (!seoRes.error && seoRes.data) seo = seoRes.data as unknown as ProductSeo
          }
          if (cancelled) return
          setProduct({ ...rest, category_name: categories?.name ?? null, seo })
        }
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [slug])

  return { product, isLoading, error }
}

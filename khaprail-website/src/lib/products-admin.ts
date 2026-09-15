import { supabase } from "@/lib/supabase"
import { stripDuplicatedExtension } from "@/lib/utils"

export interface ProductFormValues {
  name: string
  slug: string
  category_id: string | null
  description: string | null
  size: string | null
  thickness: string | null
  finish: string | null
  country_of_origin: string
  cover_image_url: string | null
  is_featured: boolean
  /** "New Arrival" badge override — see `types/product.ts`. The form always writes an explicit true/false, never leaves it unset. */
  is_new: boolean
  brand: string | null
  merchant: string | null
  sku: string | null
  availability: string | null
  manufacturer: string | null
  price: number | null
}

export interface ImageDraft {
  image_url: string
}

export interface AttributeDraft {
  attribute_type: string
  value: string
}

/**
 * Insert-or-update a product plus a full replace of its images/attributes
 * (delete-then-insert, same pattern as `saveBlogPost`). Requires the
 * authenticated admin session per the `products` RLS policies (batch 9).
 */
export async function saveProduct(
  values: ProductFormValues,
  images: ImageDraft[],
  attributes: AttributeDraft[],
  existingId: string | null
): Promise<string> {
  if (!supabase) throw new Error("Supabase project not configured yet")

  // The cover/gallery dropzones upload real files and never produce a
  // doubled extension, but the fields also accept a manually pasted Storage
  // URL — strip a doubled extension from those before saving (finding 12).
  const sanitizedValues: ProductFormValues = {
    ...values,
    cover_image_url: values.cover_image_url ? stripDuplicatedExtension(values.cover_image_url) : values.cover_image_url,
  }

  const { data, error } = existingId
    ? await supabase.from("products").update(sanitizedValues).eq("id", existingId).select("id").single()
    : await supabase.from("products").insert(sanitizedValues).select("id").single()

  if (error) throw error
  const productId = data.id as string

  const [{ error: imgDelErr }, { error: attrDelErr }] = await Promise.all([
    supabase.from("product_images").delete().eq("product_id", productId),
    supabase.from("product_attributes").delete().eq("product_id", productId),
  ])
  if (imgDelErr) throw imgDelErr
  if (attrDelErr) throw attrDelErr

  const imageRows = images
    .filter((img) => img.image_url.trim())
    .map((img, index) => ({
      product_id: productId,
      image_url: stripDuplicatedExtension(img.image_url),
      sort_order: index,
    }))
  const attributeRows = attributes
    .filter((a) => a.attribute_type.trim() && a.value.trim())
    .map((a) => ({ product_id: productId, attribute_type: a.attribute_type, value: a.value }))

  const [{ error: imgInsErr }, { error: attrInsErr }] = await Promise.all([
    imageRows.length > 0 ? supabase.from("product_images").insert(imageRows) : Promise.resolve({ error: null }),
    attributeRows.length > 0
      ? supabase.from("product_attributes").insert(attributeRows)
      : Promise.resolve({ error: null }),
  ])
  if (imgInsErr) throw imgInsErr
  if (attrInsErr) throw attrInsErr

  return productId
}

export async function deleteProduct(id: string): Promise<void> {
  if (!supabase) throw new Error("Supabase project not configured yet")
  const { error } = await supabase.from("products").delete().eq("id", id)
  if (error) throw error
}

/**
 * Writes the cached PDP AI summary (`products.ai_summary` /
 * `ai_summary_generated_at`) directly, independent of `saveProduct` — per
 * the original design, generating a summary is its own explicit write, not
 * something bundled into (or lost without) the main "Publish Tile" submit.
 * Requires an existing product id, since there's nothing to attach the
 * summary to before the product itself has been saved once.
 */
export async function saveAiSummary(productId: string, summary: string): Promise<string> {
  if (!supabase) throw new Error("Supabase project not configured yet")
  const generatedAt = new Date().toISOString()
  const { error } = await supabase
    .from("products")
    .update({ ai_summary: summary, ai_summary_generated_at: generatedAt })
    .eq("id", productId)
  if (error) throw error
  return generatedAt
}

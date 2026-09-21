import { supabase } from "@/lib/supabase"
import { invalidateCategories } from "@/hooks/use-categories"
import { stripDuplicatedExtension } from "@/lib/utils"
import type { Category } from "@/types/category"

export type CategoryFormValues = Omit<Category, "id" | "created_at">

/** Requires the authenticated admin session per the `categories` RLS policy. */
export async function saveCategory(values: CategoryFormValues, existingId: string | null): Promise<string> {
  if (!supabase) throw new Error("Supabase project not configured yet")

  // The Cover Image URL field is a plain "paste the Storage URL" input, no
  // upload widget — strip a doubled extension before it's saved (finding 12).
  const sanitizedValues: CategoryFormValues = {
    ...values,
    cover_image_url: values.cover_image_url ? stripDuplicatedExtension(values.cover_image_url) : values.cover_image_url,
  }

  const { data, error } = existingId
    ? await supabase.from("categories").update(sanitizedValues).eq("id", existingId).select("id").single()
    : await supabase.from("categories").insert(sanitizedValues).select("id").single()

  if (error) throw error
  invalidateCategories()
  return data.id as string
}

export async function deleteCategory(id: string): Promise<void> {
  if (!supabase) throw new Error("Supabase project not configured yet")
  const { error } = await supabase.from("categories").delete().eq("id", id)
  if (error) throw error
  invalidateCategories()
}

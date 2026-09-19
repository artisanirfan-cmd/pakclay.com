import { type FormEvent } from "react"
import { Link } from "react-router-dom"
import { ArrowLeftIcon, SaveIcon, CheckIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { SlugInputWithLock } from "./SlugInputWithLock"
import { CoverImageDropzone, ImageGallery, type GalleryImage } from "./ImageDropzone"
import { SuggestedSlugPanel } from "./AiSlugRecommendations"
import { AiSummaryInspector } from "./AiSummaryInspector"
import { cn } from "@/lib/utils"
import type { ProductFormValues, ImageDraft, AttributeDraft } from "@/lib/products-admin"
import type { ProductAiContext } from "@/lib/ai-chat-client"

const NO_CATEGORY = "__none__"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ProductFormStudioProps {
  isEditing: boolean
  values: ProductFormValues
  images: ImageDraft[]
  attributes: AttributeDraft[]
  categories: { id: string; name: string }[]
  categoryRows: { category: { id: string; name: string }; depth: number }[]
  isSaving: boolean
  isLoading: boolean
  saveError: string | null
  onFieldChange: <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) => void
  onImagesChange: (images: ImageDraft[]) => void
  onAttributesChange: (attrs: AttributeDraft[]) => void
  onSubmit: (e: FormEvent) => void
  /** Called when a suggested slug is clicked — sets slug + marks as locked. */
  onSlugChange: (slug: string) => void
  /** Supabase access token for the AI summary generator. */
  accessToken: string | null
  /** Existing product id, or null for a not-yet-saved new product — the AI
   *  summary can only be saved once the product itself has an id. */
  productId: string | null
  /** The AI summary currently stored on `products.ai_summary`, if any. */
  savedAiSummary: string | null
  savedAiSummaryGeneratedAt: string | null
  /** Fired after the AI summary panel writes `ai_summary` directly to the row. */
  onAiSummarySaved: (summary: string, generatedAtIso: string) => void
  /** Fired when the user explicitly copies the AI summary text into the
   *  Product Story / Description field — a separate, deliberate action from
   *  saving it as the cached AI summary. */
  onCopySummaryToDescription: (summary: string) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StudioCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("flex flex-col gap-4 rounded-lg border border-border bg-white p-5 shadow-sm", className)}>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  )
}

// Shared input classes matching the brand system
const fieldClasses = cn(
  "border-border bg-muted text-foreground",
  "placeholder:text-muted-foreground/60",
  "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
)

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ProductFormStudio({
  isEditing,
  values,
  images,
  attributes,
  categories,
  categoryRows,
  isSaving,
  isLoading,
  saveError,
  onFieldChange,
  onImagesChange,
  onAttributesChange,
  onSubmit,
  onSlugChange,
  accessToken,
  productId,
  savedAiSummary,
  savedAiSummaryGeneratedAt,
  onAiSummarySaved,
  onCopySummaryToDescription,
}: ProductFormStudioProps) {
  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <Skeleton className="mb-6 h-12 w-full" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="flex flex-col gap-6 lg:col-span-7">
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="flex flex-col gap-6 lg:col-span-5">
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </main>
    )
  }

  const categoryName = values.category_id
    ? categories.find((c) => c.id === values.category_id)?.name
    : undefined

  // Bridge ImageDraft[] <-> GalleryImage[] (both have `url`-like field)
  const galleryImages: GalleryImage[] = images.map((img) => ({ url: img.image_url }))
  function handleGalleryChange(next: GalleryImage[]) {
    onImagesChange(next.map((g) => ({ image_url: g.url })))
  }

  // Build the AI context object from current form state
  const materialAttr = attributes.find((a) => a.attribute_type.toLowerCase() === "material")?.value
  const applicationAttrs = attributes
    .filter((a) => a.attribute_type.toLowerCase() === "application")
    .map((a) => a.value)
  const aiContext: ProductAiContext = {
    name: values.name,
    material: materialAttr,
    finish: values.finish,
    size: values.size,
    thickness: values.thickness,
    country_of_origin: values.country_of_origin,
    price: values.price,
    applications: applicationAttrs.length > 0 ? applicationAttrs : undefined,
  }

  return (
    <form onSubmit={onSubmit} className="min-h-screen bg-muted">
      {/* -- Sticky Top Bar --------------------------------------- */}
      <div className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border bg-white/90 px-6 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/products"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Back to products"
          >
            <ArrowLeftIcon className="size-4" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Products</span>
            <span className="text-xs text-muted-foreground">/</span>
            <span className="text-sm font-medium text-foreground">
              {isEditing ? values.name || "Edit Product" : "New Product"}
            </span>
          </div>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
              values.is_featured
                ? "bg-badge-accent text-badge-accent-foreground"
                : "bg-secondary text-secondary-foreground",
            )}
          >
            {values.is_featured ? "Featured" : "Draft"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSaving}
            onClick={() => {
              // Save draft = same submit, just with is_featured=false
              onFieldChange("is_featured", false)
            }}
            className="gap-1.5 border-border text-foreground"
          >
            <SaveIcon className="size-3.5" />
            Save Draft
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSaving}
            className="gap-1.5 bg-primary text-white hover:bg-primary-dark"
          >
            <CheckIcon className="size-3.5" />
            {isSaving ? "Publishing..." : "Publish Tile"}
          </Button>
        </div>
      </div>

      {/* -- Body ------------------------------------------------- */}
      <div className="mx-auto w-full max-w-6xl px-6 py-6">
        {saveError && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {saveError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* -- Left Column (7/12) -------------------------------- */}
          <div className="flex flex-col gap-6 lg:col-span-7">
            {/* Primary Details */}
            <StudioCard title="Primary Details">
              <Field label="Name">
                <Input
                  required
                  value={values.name}
                  onChange={(e) => onFieldChange("name", e.target.value)}
                  placeholder="e.g. Terracotta Hexagon Floor Tile"
                  className={fieldClasses}
                />
              </Field>

              <SlugInputWithLock
                name={values.name}
                slug={values.slug}
                onSlugChange={onSlugChange}
              />

              <div className="grid grid-cols-2 gap-4">
                <Field label="Category">
                  <Select
                    value={values.category_id ?? NO_CATEGORY}
                    onValueChange={(v) =>
                      onFieldChange("category_id", v === NO_CATEGORY ? null : v)
                    }
                  >
                    <SelectTrigger className={cn("w-full", fieldClasses)}>
                      <SelectValue placeholder="Select a category">
                        {(value: string) =>
                          value === NO_CATEGORY
                            ? "Select a category"
                            : categories.find((c) => c.id === value)?.name
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {categoryRows.map(({ category, depth }) => (
                        <SelectItem key={category.id} value={category.id}>
                          {"— ".repeat(depth)}
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Surface Finish">
                  <Input
                    value={values.finish ?? ""}
                    onChange={(e) => onFieldChange("finish", e.target.value || null)}
                    placeholder="e.g. Matte, Glossy, Natural"
                    className={fieldClasses}
                  />
                </Field>
              </div>

              <Field label="Product Story / Description">
                <Textarea
                  value={values.description ?? ""}
                  onChange={(e) => onFieldChange("description", e.target.value || null)}
                  placeholder="Tell the story behind this tile — its craft, origin, best-use spaces..."
                  rows={5}
                  className={cn(fieldClasses, "resize-y")}
                />
              </Field>
            </StudioCard>

            {/* Specifications */}
            <StudioCard title="Specifications">
              <div className="grid grid-cols-3 gap-4">
                <Field label="Size">
                  <Input
                    value={values.size ?? ""}
                    onChange={(e) => onFieldChange("size", e.target.value || null)}
                    placeholder='e.g. 8"x8"'
                    className={fieldClasses}
                  />
                </Field>
                <Field label="Thickness">
                  <Input
                    value={values.thickness ?? ""}
                    onChange={(e) => onFieldChange("thickness", e.target.value || null)}
                    placeholder="e.g. 10mm"
                    className={fieldClasses}
                  />
                </Field>
                <Field label="Country of Origin">
                  <Input
                    value={values.country_of_origin}
                    onChange={(e) => onFieldChange("country_of_origin", e.target.value)}
                    className={fieldClasses}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Brand">
                  <Input
                    value={values.brand ?? ""}
                    onChange={(e) => onFieldChange("brand", e.target.value || null)}
                    className={fieldClasses}
                  />
                </Field>
                <Field label="Manufacturer">
                  <Input
                    value={values.manufacturer ?? ""}
                    onChange={(e) => onFieldChange("manufacturer", e.target.value || null)}
                    className={fieldClasses}
                  />
                </Field>
                <Field label="SKU">
                  <Input
                    value={values.sku ?? ""}
                    onChange={(e) => onFieldChange("sku", e.target.value || null)}
                    placeholder="SKU-001"
                    className={fieldClasses}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Merchant">
                  <Input
                    value={values.merchant ?? ""}
                    onChange={(e) => onFieldChange("merchant", e.target.value || null)}
                    className={fieldClasses}
                  />
                </Field>
                <Field label="Availability">
                  <Input
                    value={values.availability ?? ""}
                    onChange={(e) => onFieldChange("availability", e.target.value || null)}
                    placeholder="In Stock"
                    className={fieldClasses}
                  />
                </Field>
                <Field label="Price (PKR)">
                  <Input
                    type="number"
                    value={values.price ?? ""}
                    onChange={(e) =>
                      onFieldChange("price", e.target.value ? Number(e.target.value) : null)
                    }
                    className={fieldClasses}
                  />
                </Field>
              </div>
              <div className="flex flex-wrap gap-6 border-t border-border pt-4">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={values.is_featured}
                    onCheckedChange={(checked) =>
                      onFieldChange("is_featured", checked === true)
                    }
                  />
                  Featured
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={values.is_new}
                    onCheckedChange={(checked) =>
                      onFieldChange("is_new", checked === true)
                    }
                  />
                  New Arrival badge
                </label>
              </div>
            </StudioCard>

            {/* Attributes */}
            <StudioCard title="Filter Attributes">
              <p className="text-xs text-muted-foreground">
                These map to the storefront filter facets (type, pattern, material, finish, color, size, suitability, application).
              </p>
              <div className="flex flex-col gap-2">
                {attributes.map((attr, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      placeholder="Type (e.g. color)"
                      value={attr.attribute_type}
                      onChange={(e) => {
                        const next = [...attributes]
                        next[i] = { ...attr, attribute_type: e.target.value }
                        onAttributesChange(next)
                      }}
                      className={cn(fieldClasses, "flex-1")}
                    />
                    <Input
                      placeholder="Value (e.g. Terracotta)"
                      value={attr.value}
                      onChange={(e) => {
                        const next = [...attributes]
                        next[i] = { ...attr, value: e.target.value }
                        onAttributesChange(next)
                      }}
                      className={cn(fieldClasses, "flex-1")}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        onAttributesChange(attributes.filter((_, idx) => idx !== i))
                      }
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500"
                      title="Remove attribute"
                    >
                      <Trash2Icon className="size-3.5" />
                    </button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit gap-1.5 border-border text-foreground"
                  onClick={() =>
                    onAttributesChange([
                      ...attributes,
                      { attribute_type: "", value: "" },
                    ])
                  }
                >
                  <PlusIcon className="size-3.5" />
                  Add Attribute
                </Button>
              </div>
            </StudioCard>
          </div>

          {/* -- Right Column (5/12) — Sticky Inspector --------------- */}
          <div className="flex flex-col gap-6 lg:sticky lg:top-20 lg:col-span-5 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto lg:pb-6">
            {/* AI Product Summary */}
            <AiSummaryInspector
              productContext={aiContext}
              accessToken={accessToken}
              categoryName={categoryName}
              productId={productId}
              savedSummary={savedAiSummary}
              savedGeneratedAt={savedAiSummaryGeneratedAt}
              onSaved={onAiSummarySaved}
              onCopyToDescription={onCopySummaryToDescription}
            />

            {/* Suggested Slug & SEO (rule-based, not AI) */}
            <SuggestedSlugPanel
              title={values.name}
              category={categoryName}
              activeSlug={values.slug}
              onApply={(slug) => onSlugChange(slug)}
            />

            {/* Cover Image */}
            <div className="rounded-lg border border-border bg-white p-5 shadow-sm">
              <CoverImageDropzone
                value={values.cover_image_url}
                onChange={(url) => onFieldChange("cover_image_url", url)}
              />
            </div>

            {/* Gallery */}
            <div className="rounded-lg border border-border bg-white p-5 shadow-sm">
              <ImageGallery
                images={galleryImages}
                onChange={handleGalleryChange}
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}

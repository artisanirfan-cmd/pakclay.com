import { useCallback, useRef, useState } from "react"
import { UploadCloudIcon, Trash2Icon, PlusIcon, ImageIcon, Loader2Icon } from "lucide-react"
import { cn, getErrorMessage } from "@/lib/utils"
import { supabase } from "@/lib/supabase"

// ---------------------------------------------------------------------------
// Shared upload helper — every dropzone here uploads into the public
// `product-images` bucket and stores the permanent public URL, never a
// blob: URL (which only lives as long as the browser tab that made it) or a
// signed URL (which expires). See PROGRESS.md "images disappearing" fix.
// ---------------------------------------------------------------------------

export async function uploadProductImage(file: File): Promise<string> {
  if (!supabase) throw new Error("Supabase project not configured yet")
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg"
  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from("product-images").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  })
  if (error) throw error
  const { data } = supabase.storage.from("product-images").getPublicUrl(path)
  return data.publicUrl
}

// ---------------------------------------------------------------------------
// Cover Image Dropzone
// ---------------------------------------------------------------------------

interface CoverImageDropzoneProps {
  value: string | null
  onChange: (url: string | null) => void
}

export function CoverImageDropzone({ value, onChange }: CoverImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      const file = files?.[0]
      if (!file?.type.startsWith("image/")) return
      setIsUploading(true)
      setUploadError(null)
      try {
        onChange(await uploadProductImage(file))
      } catch (err) {
        setUploadError(getErrorMessage(err, "Upload failed"))
      } finally {
        setIsUploading(false)
      }
    },
    [onChange],
  )

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-foreground">Cover Image</label>
      <div
        className={cn(
          "group relative flex aspect-[16/10] cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border bg-muted hover:border-primary/40",
        )}
        onClick={() => !isUploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); void handleFiles(e.dataTransfer.files) }}
      >
        <input ref={inputRef} type="file" accept="image/*" className="hidden" disabled={isUploading} onChange={(e) => void handleFiles(e.target.files)} />
        {value ? (
          <>
            <img src={value} alt="Cover preview" className="absolute inset-0 h-full w-full object-cover" />
            {/* Full hover overlay with Change Cover + Remove */}
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 transition-all group-hover:bg-black/40">
              <span className="rounded-md bg-white/90 px-3 py-1.5 text-xs font-medium text-foreground opacity-0 transition-opacity group-hover:opacity-100">
                <UploadCloudIcon className="mr-1 inline size-3" />
                Change Cover
              </span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onChange(null) }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/90 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
                title="Remove cover image"
              >
                <Trash2Icon className="size-3.5" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <UploadCloudIcon className="size-8" />
            <span className="text-sm">Drop image or click to upload</span>
            <span className="text-xs">JPG, PNG, WebP</span>
          </div>
        )}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 text-sm font-medium text-white">
            <Loader2Icon className="size-4 animate-spin" />
            Uploading...
          </div>
        )}
      </div>
      {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
      <input type="text" value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        placeholder="...or paste Supabase Storage URL"
        className={cn(
          "h-8 w-full rounded-lg border px-3 text-xs font-mono transition-colors outline-none",
          "border-border bg-muted text-foreground",
          "placeholder:text-muted-foreground/50",
          "focus:border-primary focus:ring-2 focus:ring-primary/20",
        )} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Multi-Image Gallery
// ---------------------------------------------------------------------------

export interface GalleryImage { url: string }

interface ImageGalleryProps {
  images: GalleryImage[]
  onChange: (images: GalleryImage[]) => void
}

export function ImageGallery({ images, onChange }: ImageGalleryProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      const picked = files ? Array.from(files).filter((f) => f.type.startsWith("image/")) : []
      if (picked.length === 0) return
      setIsUploading(true)
      setUploadError(null)
      try {
        const uploaded = await Promise.all(picked.map((f) => uploadProductImage(f)))
        onChange([...images, ...uploaded.map((url) => ({ url }))])
      } catch (err) {
        setUploadError(getErrorMessage(err, "Upload failed"))
      } finally {
        setIsUploading(false)
      }
    },
    [images, onChange],
  )

  function removeAt(i: number) { onChange(images.filter((_, idx) => idx !== i)) }
  function moveAt(from: number, to: number) {
    if (to < 0 || to >= images.length) return
    const next = [...images]; const [m] = next.splice(from, 1); next.splice(to, 0, m); onChange(next)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <ImageIcon className="size-4 text-muted-foreground" />
          Gallery Images
        </label>
        {images.length > 0 && (
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-secondary-foreground">
            {images.length} {images.length === 1 ? "image" : "images"}
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {images.map((img, i) => (
          <div key={img.url + i} className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
            <img src={img.url} alt={`Gallery ${i + 1}`} className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
              {i > 0 && <button type="button" onClick={() => moveAt(i, i - 1)} className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-xs font-bold text-foreground" title="Move left">‹</button>}
              {i < images.length - 1 && <button type="button" onClick={() => moveAt(i, i + 1)} className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-xs font-bold text-foreground" title="Move right">›</button>}
              <button type="button" onClick={() => removeAt(i)} className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500/90 text-white hover:bg-red-600" title="Remove">
                <Trash2Icon className="size-3.5" />
              </button>
            </div>
            <span className="absolute bottom-1 left-1 flex h-5 min-w-5 items-center justify-center rounded bg-black/60 px-1 text-[10px] font-medium text-white">{i + 1}</span>
          </div>
        ))}
        <div className={cn(
          "flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border bg-muted text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary",
          isUploading && "pointer-events-none opacity-60",
        )}
          onClick={() => !isUploading && inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); void handleFiles(e.dataTransfer.files) }}>
          <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" disabled={isUploading} onChange={(e) => void handleFiles(e.target.files)} />
          {isUploading ? <Loader2Icon className="size-6 animate-spin" /> : <PlusIcon className="size-6" />}
          <span className="text-xs">{isUploading ? "Uploading..." : "Add"}</span>
        </div>
      </div>
      {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
    </div>
  )
}

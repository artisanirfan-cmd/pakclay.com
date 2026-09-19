import { useCallback, useRef, useState } from "react"
import { ImageIcon, Loader2Icon, UploadCloudIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { uploadProductImage } from "@/components/admin/ImageDropzone"
import { buildImageMarkdown } from "@/lib/markdown"
import { cn, getErrorMessage } from "@/lib/utils"

// "Insert Image" for the blog's Full Content editor: pick or drop a file, it
// uploads to Supabase Storage through the same helper as the Products
// dropzone (so the saved value is the permanent getPublicUrl() URL, never a
// blob: or expiring signed URL), the editor must supply alt text, and the
// caller receives ready-to-insert `![alt](url)` Markdown. Every button here is
// type="button" and there is no nested <form>: the editor's own <form> must
// not submit when this panel is used.

interface ContentImageInserterProps {
  onInsert: (markdown: string) => void
}

export function ContentImageInserter({ onInsert }: ContentImageInserterProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [alt, setAlt] = useState("")

  const canInsert = Boolean(url) && alt.trim().length > 0 && !isUploading

  function reset() {
    setIsOpen(false)
    setIsDragging(false)
    setUploadError(null)
    setUrl(null)
    setAlt("")
  }

  const handleFiles = useCallback(async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setUploadError("That file is not an image.")
      return
    }
    setIsUploading(true)
    setUploadError(null)
    try {
      setUrl(await uploadProductImage(file))
    } catch (err) {
      setUploadError(getErrorMessage(err, "Upload failed"))
    } finally {
      setIsUploading(false)
    }
  }, [])

  function handleInsert() {
    if (!canInsert || !url) return
    onInsert(buildImageMarkdown(alt, url))
    reset()
  }

  if (!isOpen) {
    return (
      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setIsOpen(true)}>
        <ImageIcon data-icon="inline-start" />
        Insert Image
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Insert image into content</span>
        <button type="button" onClick={reset} className="text-sm text-muted-foreground hover:text-foreground">
          Cancel
        </button>
      </div>

      <div
        className={cn(
          "relative flex min-h-28 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-border bg-muted hover:border-primary/40",
        )}
        onClick={() => !isUploading && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          void handleFiles(e.dataTransfer.files)
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={isUploading}
          onChange={(e) => {
            void handleFiles(e.target.files)
            e.target.value = ""
          }}
        />
        {url ? (
          <img src={url} alt="Uploaded preview" className="max-h-48 w-auto object-contain p-2" />
        ) : (
          <div className="flex flex-col items-center gap-1 py-4 text-muted-foreground">
            <UploadCloudIcon className="size-6" />
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
      {url && !isUploading && <p className="text-xs text-muted-foreground">Uploaded. Click the image to replace it.</p>}
      {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="content-image-alt" className="text-sm font-medium">
          Alt text <span className="text-destructive">(required)</span>
        </label>
        <Input
          id="content-image-alt"
          required
          aria-required="true"
          value={alt}
          placeholder="Describe the image for screen readers and search engines"
          onChange={(e) => setAlt(e.target.value)}
          onKeyDown={(e) => {
            // Enter must not submit the surrounding post form.
            if (e.key === "Enter") {
              e.preventDefault()
              handleInsert()
            }
          }}
        />
      </div>

      <Button type="button" size="sm" className="w-fit" disabled={!canInsert} onClick={handleInsert}>
        Insert into content
      </Button>
    </div>
  )
}

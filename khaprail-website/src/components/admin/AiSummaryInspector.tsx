import { useCallback, useEffect, useState } from "react"
import {
  SparklesIcon,
  RefreshCwIcon,
  Wand2Icon,
  CopyIcon,
  CheckIcon,
  PencilIcon,
  SaveIcon,
} from "lucide-react"
import { cn, getErrorMessage } from "@/lib/utils"
import {
  generateStaticSummary,
  type SummaryTone,
  type ProductAiContext,
} from "@/lib/ai-chat-client"
import { saveAiSummary } from "@/lib/products-admin"

const TONE_OPTIONS: { value: SummaryTone; label: string; hint: string }[] = [
  { value: "architectural", label: "Architectural", hint: "Technical, material-focused" },
  { value: "commercial", label: "Commercial", hint: "Sales-driven, benefit-led" },
  { value: "minimal", label: "Minimal", hint: "Clean, understated" },
]

interface AiSummaryInspectorProps {
  productContext: ProductAiContext
  accessToken: string | null
  categoryName?: string
  /** Existing product id, or null for a not-yet-saved new product. */
  productId: string | null
  /** The summary currently stored on `products.ai_summary`, if any. */
  savedSummary: string | null
  savedGeneratedAt: string | null
  /** Fired after a successful save to `products.ai_summary`. */
  onSaved: (summary: string, generatedAtIso: string) => void
  /** Explicit, separate action: copy this text into the real Description field. */
  onCopyToDescription: (summary: string) => void
}

export function AiSummaryInspector({
  productContext,
  accessToken,
  categoryName,
  productId,
  savedSummary,
  savedGeneratedAt,
  onSaved,
  onCopyToDescription,
}: AiSummaryInspectorProps) {
  const [tone, setTone] = useState<SummaryTone>("architectural")
  const [generatedText, setGeneratedText] = useState<string | null>(null)
  const [editedText, setEditedText] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)

  // Seed the panel with whatever's already saved on the product, so opening
  // an existing product shows its cached summary instead of a blank panel.
  useEffect(() => {
    if (savedSummary && generatedText === null) {
      setGeneratedText(savedSummary)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedSummary])

  const canGenerate = !!accessToken && !!productContext.name.trim()
  const activeText = editedText || generatedText || ""
  const hasUnsavedChanges = !!activeText && activeText !== savedSummary
  const canSave = !!productId && hasUnsavedChanges

  const handleGenerate = useCallback(async () => {
    if (!accessToken) return
    setIsGenerating(true)
    setError(null)
    try {
      const result = await generateStaticSummary(
        productContext,
        tone,
        accessToken,
        categoryName,
      )
      setGeneratedText(result)
      setEditedText("")
      setCopied(false)
      setJustSaved(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate summary")
    } finally {
      setIsGenerating(false)
    }
  }, [productContext, tone, accessToken, categoryName])

  const handleCopy = useCallback(async () => {
    if (!activeText) return
    await navigator.clipboard.writeText(activeText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [activeText])

  const handleSave = useCallback(async () => {
    if (!productId || !activeText) return
    setIsSaving(true)
    setSaveError(null)
    try {
      const generatedAt = await saveAiSummary(productId, activeText)
      onSaved(activeText, generatedAt)
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 2000)
    } catch (err) {
      setSaveError(getErrorMessage(err, "Failed to save AI summary"))
    } finally {
      setIsSaving(false)
    }
  }, [productId, activeText, onSaved])

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <SparklesIcon className="size-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">AI Product Summary</h3>
        </div>
        {savedGeneratedAt && (
          <span className="text-[10px] text-muted-foreground">
            Saved on PDP · {new Date(savedGeneratedAt).toLocaleDateString()}
          </span>
        )}
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">
        Saves to its own "AI-generated summary" card on the product page — never overwrites the real Description.
      </p>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Tone</span>
        <div className="flex gap-1.5">
          {TONE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTone(opt.value)}
              title={opt.hint}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                tone === opt.value
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border bg-muted text-muted-foreground hover:border-primary/30 hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        disabled={!canGenerate || isGenerating}
        onClick={handleGenerate}
        className={cn(
          "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          "bg-primary text-white hover:bg-primary-dark",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        {isGenerating ? (
          <>
            <RefreshCwIcon className="size-4 animate-spin" />
            Generating...
          </>
        ) : generatedText ? (
          <>
            <RefreshCwIcon className="size-4" />
            Regenerate
          </>
        ) : (
          <>
            <Wand2Icon className="size-4" />
            Generate Summary
          </>
        )}
      </button>

      {!productContext.name.trim() && (
        <p className="text-center text-xs text-muted-foreground">
          Enter a product name first
        </p>
      )}

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      {generatedText && (
        <>
          <div className="relative rounded-lg border border-border bg-muted p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                <PencilIcon className="size-3" />
                Edit before saving
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex h-6 items-center gap-1 rounded-md border border-border bg-white px-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                title={copied ? "Copied!" : "Copy to clipboard"}
              >
                {copied ? (
                  <><CheckIcon className="size-3 text-green-600" /> Copied</>
                ) : (
                  <><CopyIcon className="size-3" /> Copy</>
                )}
              </button>
            </div>
            <textarea
              value={activeText}
              onChange={(e) => setEditedText(e.target.value)}
              rows={4}
              className={cn(
                "w-full resize-y rounded-md border border-border bg-white px-3 py-2 text-sm leading-relaxed text-foreground outline-none",
                "focus:border-primary focus:ring-2 focus:ring-primary/20",
              )}
            />
            <p className="mt-1 text-right text-[10px] text-muted-foreground">
              {activeText.split(/\s+/).filter(Boolean).length} words
            </p>
          </div>

          {saveError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {saveError}
            </p>
          )}

          <button
            type="button"
            disabled={!canSave || isSaving}
            onClick={() => void handleSave()}
            title={!productId ? "Save the product first, then save its AI summary" : undefined}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg border border-primary/30 px-3 py-2 text-sm font-medium transition-colors",
              "text-primary hover:bg-primary/5",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            {isSaving ? (
              <><RefreshCwIcon className="size-3.5 animate-spin" /> Saving...</>
            ) : justSaved ? (
              <><CheckIcon className="size-3.5 text-green-600" /> Saved to product page</>
            ) : (
              <><SaveIcon className="size-3.5" /> Save as AI Summary</>
            )}
          </button>
          {!productId && (
            <p className="text-center text-[11px] text-muted-foreground">
              Save the product first — the AI summary needs an existing product to attach to.
            </p>
          )}

          {activeText && (
            <button
              type="button"
              onClick={() => onCopyToDescription(activeText)}
              className="text-center text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Or copy this text into the Description field instead (overwrites it)
            </button>
          )}
        </>
      )}
    </div>
  )
}
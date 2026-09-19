import { useCallback, useEffect, useRef, useState } from "react"
import { LockIcon, UnlockIcon } from "lucide-react"
import { cn, slugify } from "@/lib/utils"

interface SlugInputWithLockProps {
  name: string
  slug: string
  onSlugChange: (slug: string) => void
  /** Base URL shown in the live preview. */
  baseUrl?: string
}

/**
 * Two-state slug input: when "linked" (lock icon closed), typing the
 * product name auto-generates the slug in real-time. Clicking the lock
 * (or editing the slug directly) unlinks it so manual/AI-chosen slugs
 * are preserved.
 */
export function SlugInputWithLock({
  name,
  slug,
  onSlugChange,
  baseUrl = "https://khaprailtiles.pk/products",
}: SlugInputWithLockProps) {
  const [isLinked, setIsLinked] = useState(true)
  const prevNameRef = useRef(name)

  // Auto-sync slug from name while linked
  useEffect(() => {
    if (!isLinked) return
    if (name !== prevNameRef.current) {
      prevNameRef.current = name
      onSlugChange(slugify(name))
    }
  }, [name, isLinked, onSlugChange])

  // Initial sync on mount when slug is empty
  useEffect(() => {
    if (isLinked && !slug && name) {
      onSlugChange(slugify(name))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSlugEdit = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isLinked) setIsLinked(false)
      onSlugChange(slugify(e.target.value))
    },
    [isLinked, onSlugChange],
  )

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">Slug</label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={slug}
          onChange={handleSlugEdit}
          placeholder="product-slug"
          className={cn(
            "h-9 w-full rounded-lg border px-3 py-1.5 font-mono text-sm transition-colors outline-none",
            "border-border bg-muted text-foreground",
            "placeholder:text-muted-foreground",
            "focus:border-primary focus:ring-2 focus:ring-primary/20",
          )}
        />
        <button
          type="button"
          onClick={() => setIsLinked((v) => !v)}
          title={isLinked ? "Unlink slug from title" : "Re-link slug to title"}
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
            isLinked
              ? "border-primary/30 bg-primary/5 text-primary"
              : "border-border bg-muted text-muted-foreground hover:text-foreground",
          )}
        >
          {isLinked ? <LockIcon className="size-4" /> : <UnlockIcon className="size-4" />}
        </button>
      </div>
      <p className="truncate font-mono text-xs text-muted-foreground">
        {baseUrl}/{slug || <span className="italic">slug</span>}
      </p>
    </div>
  )
}

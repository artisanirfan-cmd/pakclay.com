import { useState } from "react"
import type { VariantProps } from "class-variance-authority"
import { buttonVariants } from "@/components/ui/button"
import { downloadBlob } from "@/lib/pdf/download"
import type { SpecSheetProduct } from "@/lib/pdf/spec-sheet-document"

interface DownloadSpecSheetButtonProps {
  product: SpecSheetProduct
  size?: VariantProps<typeof buttonVariants>["size"]
  className?: string
}

type Status = "idle" | "preparing" | "error"

// "Download Spec Sheet" (05-PDP-SPEC.md) — branded PDF generated client-side
// via @react-pdf/renderer, which is imported only when the visitor clicks
// (lib/pdf/download.ts explains why). Styled with buttonVariants directly.
// Reused by the PDP (large CTA) and the Downloads page (per-row button).
export function DownloadSpecSheetButton({
  product,
  size = "lg",
  className = "h-14 px-7 text-lg",
}: DownloadSpecSheetButtonProps) {
  const [status, setStatus] = useState<Status>("idle")

  async function handleClick() {
    if (status === "preparing") return
    setStatus("preparing")
    try {
      const [{ pdf }, { SpecSheetDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/lib/pdf/spec-sheet-document"),
      ])
      const blob = await pdf(<SpecSheetDocument product={product} />).toBlob()
      downloadBlob(blob, `${product.slug}-spec-sheet.pdf`)
      setStatus("idle")
    } catch {
      setStatus("error")
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={status === "preparing"}
      aria-busy={status === "preparing"}
      className={buttonVariants({ size, variant: "outline", className })}
    >
      {status === "preparing" ? "Preparing..." : status === "error" ? "Try again" : "Download Spec Sheet"}
    </button>
  )
}

import { useState } from "react"
import { buttonVariants } from "@/components/ui/button"
import { downloadBlob } from "@/lib/pdf/download"
import type { CatalogCollection } from "@/lib/pdf/catalog-document"

interface DownloadCatalogButtonProps {
  collections: CatalogCollection[]
}

type Status = "idle" | "preparing" | "error"

// The full catalog PDF is generated live from real data, but only when the
// visitor clicks: the PDF engine is imported here on demand (see
// lib/pdf/download.ts for why), then the file downloads automatically.
export function DownloadCatalogButton({ collections }: DownloadCatalogButtonProps) {
  const [status, setStatus] = useState<Status>("idle")

  async function handleClick() {
    if (status === "preparing") return
    setStatus("preparing")
    try {
      const [{ pdf }, { CatalogDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/lib/pdf/catalog-document"),
      ])
      const blob = await pdf(<CatalogDocument collections={collections} />).toBlob()
      downloadBlob(blob, "khaprail-tiles-catalog.pdf")
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
      className={buttonVariants({ size: "lg", className: "h-14 px-7 text-lg" })}
    >
      {status === "preparing" ? "Preparing..." : status === "error" ? "Couldn't prepare the PDF — try again" : "Download Full Catalog"}
    </button>
  )
}

import { stripMarkdown } from "@/lib/markdown"

// Helpers that turn real CMS content into meta-description-safe text.

/** Placeholder copy that must never reach a meta description or structured data. */
const PLACEHOLDER_PATTERNS = [/needs a full description/i, /imported from real product photography/i, /lorem ipsum/i, /^\s*(tbd|todo|coming soon)\s*\.?\s*$/i]

export function isPlaceholderText(text: string | null | undefined): boolean {
  if (!text) return true
  return PLACEHOLDER_PATTERNS.some((re) => re.test(text))
}

/** Markdown-stripped, whitespace-collapsed plain text; "" for null/placeholder. */
export function cleanText(text: string | null | undefined): string {
  if (!text || isPlaceholderText(text)) return ""
  return stripMarkdown(text)
}

/** Truncates at a word boundary (never mid-word) and adds an ellipsis only when something was cut. */
export function truncateAtWord(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(" ")
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.\-—–]+$/, "") + "…"
}

/** Joins a list as "a, b and c". */
export function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("")
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`
}

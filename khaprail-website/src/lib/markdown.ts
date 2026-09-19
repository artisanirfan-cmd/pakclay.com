// Small Markdown helpers shared by the public blog and the admin editor.

/**
 * Flatten Markdown to plain text for spots that must never show raw syntax
 * (blog listing excerpts, the Answer Box): headings, emphasis, inline code,
 * links (keeps the link text), images (keeps the alt text), list markers,
 * blockquote markers and horizontal rules are all removed.
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1") // images -> alt text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links -> link text
    .replace(/^\s{0,3}(-{3,}|\*{3,}|_{3,})\s*$/gm, "") // horizontal rules
    .replace(/^\s{0,3}#{1,6}\s+/gm, "") // heading markers
    .replace(/^\s{0,3}>\s?/gm, "") // blockquote markers
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, "") // list markers
    .replace(/(\*\*|__)(.+?)\1/g, "$2") // bold
    .replace(/(\*|_)(.+?)\1/g, "$2") // italic
    .replace(/`([^`]+)`/g, "$1") // inline code
    .replace(/\s+/g, " ")
    .trim()
}

/** Markdown image syntax that is safe to drop into the body (`![alt](url)`). */
export function buildImageMarkdown(alt: string, url: string): string {
  const safeAlt = alt.replace(/[[\]\r\n]+/g, " ").replace(/\s+/g, " ").trim()
  const safeUrl = url.replace(/\(/g, "%28").replace(/\)/g, "%29").replace(/\s/g, "%20")
  return `![${safeAlt}](${safeUrl})`
}

/**
 * Insert `snippet` into `value` at the [start, end) selection as its own
 * block (blank line before and after), returning the new text and where the
 * cursor should land (just after the inserted block).
 */
export function insertBlockAtSelection(
  value: string,
  start: number,
  end: number,
  snippet: string,
): { value: string; cursor: number } {
  const from = Math.max(0, Math.min(start, value.length))
  const to = Math.max(from, Math.min(end, value.length))
  const before = value.slice(0, from)
  const after = value.slice(to)
  const lead = before.length === 0 ? "" : before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n"
  const trail = after.length === 0 ? "\n" : after.startsWith("\n\n") ? "" : after.startsWith("\n") ? "\n" : "\n\n"
  const inserted = `${lead}${snippet}${trail}`
  return { value: `${before}${inserted}${after}`, cursor: before.length + inserted.length }
}

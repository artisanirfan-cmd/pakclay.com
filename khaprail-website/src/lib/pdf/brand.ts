// PAKCLAY.COM's blue / slate / gray tokens (src/index.css) — react-pdf
// can't read CSS variables, so the brand hex values are duplicated here.
// Shared by every PDF document (spec sheets, the full catalog) so they read
// as one consistent, branded set rather than drifting independently.
// Keep in sync with :root in src/index.css (see 02-DESIGN-SYSTEM.md).
export const PDF_COLORS = {
  primary: "#2563EB",
  foreground: "#1E293B",
  muted: "#64748B",
  border: "#E5E8EB",
} as const

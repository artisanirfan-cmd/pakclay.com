import { safeJsonLd } from "@/lib/seo/json-ld"

// Renders one <script type="application/ld+json"> per node. Rendered into the
// page body (Google reads JSON-LD anywhere in the document) so it is captured
// by the build-time prerender snapshot and is present in the static HTML that
// non-JavaScript crawlers receive. Falsy entries are skipped.
export function JsonLd({ data }: { data: unknown }) {
  const nodes = (Array.isArray(data) ? data : [data]).filter(Boolean)
  return (
    <>
      {nodes.map((node, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(node) }} />
      ))}
    </>
  )
}

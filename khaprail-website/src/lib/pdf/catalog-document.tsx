import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import { WHATSAPP_DISPLAY_NUMBER } from "@/lib/whatsapp"
import { PDF_COLORS } from "@/lib/pdf/brand"

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, color: PDF_COLORS.foreground },
  coverBrand: { fontSize: 28, fontWeight: 700, color: PDF_COLORS.primary, marginBottom: 8 },
  coverTagline: { fontSize: 12, color: PDF_COLORS.muted, marginBottom: 4 },
  coverTitle: { fontSize: 16, marginTop: 24 },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: PDF_COLORS.primary, marginTop: 20, marginBottom: 8 },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: PDF_COLORS.border,
    paddingVertical: 6,
  },
  name: { flex: 1 },
  size: { width: 120, color: PDF_COLORS.muted },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 9, color: PDF_COLORS.muted },
})

export interface CatalogProduct {
  name: string
  size: string | null
}

export interface CatalogCollection {
  name: string
  products: CatalogProduct[]
}

interface CatalogDocumentProps {
  collections: CatalogCollection[]
}

// "Download Catalog" (01-SITE-MAP.md /downloads, referenced by the Hero's
// "Download Catalog" CTA) — generated from real `products`/`categories`
// data rather than a static file, so it's never stale or fabricated.
// (Internal `CatalogCollection`/`collections` naming here is just this PDF
// module's own vocabulary for "a named group of products" — unrelated to
// the removed `collections` table.)
export function CatalogDocument({ collections }: CatalogDocumentProps) {
  return (
    <Document title="PAKCLAY.COM — Full Catalog">
      <Page size="A4" style={styles.page}>
        <Text style={styles.coverBrand}>PAKCLAY.COM</Text>
        <Text style={styles.coverTagline}>Est. 1982 · Lahore, Pakistan</Text>
        <Text style={styles.coverTitle}>Full Product Catalog</Text>
      </Page>
      {collections.map((collection) => (
        <Page key={collection.name} size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>{collection.name}</Text>
          {collection.products.map((product) => (
            <View key={product.name} style={styles.row}>
              <Text style={styles.name}>{product.name}</Text>
              {product.size && <Text style={styles.size}>{product.size}</Text>}
            </View>
          ))}
          <Text style={styles.footer}>khaprail.com.pk · WhatsApp {WHATSAPP_DISPLAY_NUMBER}</Text>
        </Page>
      ))}
    </Document>
  )
}

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import { WHATSAPP_DISPLAY_NUMBER } from "@/lib/whatsapp"
import { PDF_COLORS } from "@/lib/pdf/brand"

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, color: PDF_COLORS.foreground },
  brand: { fontSize: 14, fontWeight: 700, color: PDF_COLORS.primary, marginBottom: 4 },
  tagline: { fontSize: 9, color: PDF_COLORS.muted, marginBottom: 24 },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 16 },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: PDF_COLORS.border,
    paddingVertical: 8,
  },
  label: { width: 160, color: PDF_COLORS.muted },
  value: { flex: 1 },
  description: { marginTop: 16, lineHeight: 1.5 },
  footer: { position: "absolute", bottom: 32, left: 40, right: 40, fontSize: 9, color: PDF_COLORS.muted },
})

// The fields a spec sheet actually needs — deliberately narrower than the
// full PDP `ProductDetail` type (no images/attributes) so the Downloads page
// can generate one from a lightweight product list query, not the PDP's
// full nested fetch.
export interface SpecSheetProduct {
  name: string
  slug: string
  size: string | null
  thickness: string | null
  finish: string | null
  country_of_origin: string
  brand: string | null
  merchant: string | null
  sku: string | null
  availability: string | null
  manufacturer: string | null
  category_name: string | null
  description: string | null
}

interface SpecSheetDocumentProps {
  product: SpecSheetProduct
}

// Branded downloadable spec sheet (05-PDP-SPEC.md).
export function SpecSheetDocument({ product }: SpecSheetDocumentProps) {
  const rows: [string, string | null][] = [
    ["Brand", product.brand],
    ["Merchant", product.merchant],
    ["Category", product.category_name],
    ["Availability", product.availability],
    ["SKU", product.sku],
    ["Manufacturer", product.manufacturer],
    ["Size", product.size],
    ["Thickness", product.thickness],
    ["Finish", product.finish],
    ["Country of Origin", product.country_of_origin],
  ]
  const visibleRows = rows.filter(([, value]) => !!value)

  return (
    <Document title={`${product.name} — Spec Sheet`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>PAKCLAY.COM</Text>
        <Text style={styles.tagline}>Est. 1982 · Lahore, Pakistan</Text>
        <Text style={styles.title}>{product.name}</Text>
        <View>
          {visibleRows.map(([label, value]) => (
            <View key={label} style={styles.row}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.value}>{value}</Text>
            </View>
          ))}
        </View>
        {product.description && <Text style={styles.description}>{product.description}</Text>}
        <Text style={styles.footer}>khaprail.com.pk · WhatsApp {WHATSAPP_DISPLAY_NUMBER}</Text>
      </Page>
    </Document>
  )
}

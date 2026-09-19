// Click-time PDF generation helpers. @react-pdf/renderer (fontkit, its own
// layout engine, yoga, brotli ...) is ~1.26 MB uncompressed, so it is NEVER
// imported statically or rendered on mount: the buttons below only
// `import()` it when a visitor actually clicks, and generate the file then.
// (Previously `PDFDownloadLink` mounted on the homepage and every product
// page, downloading the library AND building the whole catalog PDF in the
// background on first paint — ~510 KiB gzipped and ~2 s of blocking time.)

/** Save a generated Blob as a file via a temporary object-URL link. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Give the browser a moment to start the download before releasing the URL.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

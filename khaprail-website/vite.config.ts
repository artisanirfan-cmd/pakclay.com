import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        // Vendor chunks: React + the router, and the Supabase client, each
        // get their own long-lived chunk instead of all sitting inside one
        // ~680 KiB entry chunk. The site redeploys often, and app-code edits
        // no longer invalidate these (they change only when the dependency
        // does), so returning visitors re-download far less. The browser also
        // fetches and parses them in parallel. (The PDF stack is deliberately
        // NOT grouped: it is import()ed on click only — see lib/pdf/download.ts.)
        codeSplitting: {
          groups: [
            {
              name: "vendor-react",
              test: /node_modules[/](react|react-dom|scheduler|react-router|react-router-dom)[/]/,
              priority: 30,
            },
            {
              name: "vendor-supabase",
              test: /node_modules[/]@supabase[/]/,
              priority: 20,
            },
          ],
        },
      },
    },
  },
})

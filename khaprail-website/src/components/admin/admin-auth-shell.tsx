import { Suspense } from "react"
import { Outlet } from "react-router-dom"
import { AuthProvider } from "@/lib/auth-context"
import { RouteLoadingFallback } from "@/components/shared/route-loading-fallback"

// Wraps every /admin/* route (including /admin/login) with the Supabase auth
// session provider. It used to wrap the WHOLE app in App.tsx, so every public
// storefront visit paid for the admin session bootstrap (and shipped
// AdminLayout / ProtectedRoute in the entry chunk). Only admin components call
// `useAuth()`, so it now lives here — loaded lazily, only when someone actually
// navigates to /admin.
export function AdminAuthShell() {
  return (
    <AuthProvider>
      <Suspense fallback={<RouteLoadingFallback />}>
        <Outlet />
      </Suspense>
    </AuthProvider>
  )
}

import { Suspense } from "react"
import { Outlet } from "react-router-dom"
import { SubBrandBar } from "@/components/layout/sub-brand-bar"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { FloatingWhatsAppButton } from "@/components/shared/floating-whatsapp-button"
import { DeferredChatWidget } from "@/components/shared/deferred-chat-widget"
import { RouteLoadingFallback } from "@/components/shared/route-loading-fallback"
import { MobileTabBar } from "@/components/nav/mobile-tab-bar"
import { MobileDrawerProvider } from "@/lib/mobile-drawer-context"
import { ChatPanelProvider } from "@/lib/chat-panel-context"

// `pb-20` reserves room for the fixed mobile `MobileTabBar` so it never
// overlaps page content/the footer — `lg:pb-0` since that bar only shows
// below the `lg` breakpoint. The `<Suspense>` around `<Outlet />` (not
// around this whole layout) means every lazy-loaded route (App.tsx, SEO/perf
// batch A) only shows a loading state in the page-content area — the
// header/footer/chat widget/tab bar mount immediately and never flash away.
export function SiteLayout() {
  return (
    <MobileDrawerProvider>
      <ChatPanelProvider>
        <div className="flex min-h-svh flex-col pb-20 lg:pb-0">
          <SubBrandBar />
          <SiteHeader />
          <Suspense fallback={<RouteLoadingFallback />}>
            <Outlet />
          </Suspense>
          <SiteFooter />
          <FloatingWhatsAppButton />
          <DeferredChatWidget />
          <MobileTabBar />
        </div>
      </ChatPanelProvider>
    </MobileDrawerProvider>
  )
}

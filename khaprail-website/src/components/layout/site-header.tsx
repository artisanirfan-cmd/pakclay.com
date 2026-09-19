import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { SparklesIcon } from "lucide-react"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu"
import { Button } from "@/components/ui/button"
import { CategoriesMegaMenu } from "@/components/nav/categories-mega-menu"
import { MobileNav } from "@/components/nav/mobile-nav"
import { SiteSearch } from "@/components/nav/site-search"
import { NAV_LINKS } from "@/lib/nav-links"
import { useCategories } from "@/hooks/use-categories"
import { useChatPanel } from "@/lib/chat-panel-context"
import { buildWhatsAppUrl, DEFAULT_WHATSAPP_MESSAGE } from "@/lib/whatsapp"
import { cn } from "@/lib/utils"

// Nav-strip link styling — white text on the solid navy strip, filled pill
// on hover/active/open rather than an underline. `px-2` tightens the built-in
// trigger/link horizontal padding (navigation-menu.tsx's shared px-2.5) so
// the larger text below doesn't crowd/wrap at narrower desktop widths.
// Bumped 2026-09-10: text-base -> text-lg (a clear size step, per request)
// and the list's gap-0.5 -> gap-3 for noticeably more breathing room
// between items — verified at 1024px (the `lg` breakpoint floor) through
// 1536px with no overflow/wrap, see 00-PROGRESS.md.
const NAV_ITEM_CLASS =
  "rounded-full px-2 text-lg font-medium text-navy-foreground hover:bg-navy-foreground/15 data-active:bg-navy-foreground/15 data-popup-open:bg-navy-foreground/15 data-open:bg-navy-foreground/15"

// Two-bar header (2026-08-25 restyle): a white top bar (logo + real CTA —
// no Login/Wishlist/Cart/search affordances were added here since this site
// has no customer accounts, wishlist, or cart to back them, see
// 00-PROGRESS.md) and a solid navy sub-nav strip underneath.
export function SiteHeader() {
  const { categories, isLoading, error } = useCategories()
  const { open: openChatPanel } = useChatPanel()
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    function onScroll() {
      setIsScrolled(window.scrollY > 8)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header className={cn("sticky top-0 z-40 transition-shadow duration-200", isScrolled && "shadow-lg")}>
      <div className="bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link to="/" className="shrink-0 font-heading text-3xl font-bold text-primary">
            PAKCLAY.COM
          </Link>
          {/* Centered between the logo and "Get a Sample" — moved here from
              the navy nav strip below (2026-09-10); the search bar itself
              (size/styling/behavior) is unchanged, see site-search.tsx. */}
          <div className="hidden flex-1 justify-center lg:flex">
            <SiteSearch />
          </div>
          <div className="flex items-center gap-2">
            <Button
              className="hidden h-11 rounded-full px-5 text-base lg:inline-flex"
              nativeButton={false}
              render={<a href={buildWhatsAppUrl(DEFAULT_WHATSAPP_MESSAGE)} target="_blank" rel="noreferrer" />}
            >
              Get a Sample
            </Button>
            <MobileNav categories={categories} isLoading={isLoading} error={error} />
          </div>
        </div>
      </div>

      <div className="hidden bg-navy lg:block">
        <div className="mx-auto flex h-12 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <NavigationMenu className="max-w-none">
            <NavigationMenuList className="gap-3">
              <CategoriesMegaMenu
                categories={categories}
                isLoading={isLoading}
                error={error}
                triggerClassName={NAV_ITEM_CLASS}
              />
              {NAV_LINKS.filter((link) => link.label !== "Home").map((link) => (
                <NavigationMenuItem key={link.to}>
                  <NavigationMenuLink render={<Link to={link.to} />} className={NAV_ITEM_CLASS}>
                    {link.label}
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
          <button
            type="button"
            onClick={openChatPanel}
            aria-label="Ask the AI assistant"
            className="ml-auto flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground outline-none transition-transform hover:scale-105 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95"
          >
            <SparklesIcon className="size-4" />
          </button>
        </div>
      </div>
    </header>
  )
}

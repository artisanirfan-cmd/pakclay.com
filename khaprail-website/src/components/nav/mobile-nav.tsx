import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { MenuIcon, XIcon, DownloadIcon, SearchIcon, ArrowLeftIcon, SparklesIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { Skeleton } from "@/components/ui/skeleton"
import { StorageImage } from "@/components/shared/storage-image"
import { buildWhatsAppUrl, DEFAULT_WHATSAPP_MESSAGE } from "@/lib/whatsapp"
import { getRootCategories, getCategoryChildren } from "@/lib/category-tree"
import { useMobileDrawer } from "@/lib/mobile-drawer-context"
import { useChatPanel } from "@/lib/chat-panel-context"
import { useProductSearch } from "@/hooks/use-product-search"
import type { Category } from "@/types/category"

interface MobileNavProps {
  categories: Category[]
  isLoading: boolean
  error: string | null
}

// Category drawer (mobile hamburger menu) — a flat, single-open accordion
// of root categories only (no nested "Categories" wrapper item, unlike the
// old version of this component), each category its own row per
// 12-CATEGORY-TAXONOMY.md, pulled live from the `categories` table like the
// desktop mega-menu — never hardcoded. A leaf root category (no
// subcategories — 13 of the 15 real root categories today) navigates
// straight to its listing on tap instead of expanding onto an empty panel.
// The header's search icon (batch 27 left this slot conceptually open, no
// UI existed yet) swaps the category list for a full-width search sub-view
// with the same debounced live-results behavior as the desktop navbar.
export function MobileNav({ categories, isLoading, error }: MobileNavProps) {
  const { categoryDrawerOpen, setCategoryDrawerOpen } = useMobileDrawer()
  const { open: openChatPanel } = useChatPanel()
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [query, setQuery] = useState("")
  const navigate = useNavigate()
  const roots = getRootCategories(categories)
  const { results, isLoading: searchLoading } = useProductSearch(query)
  const trimmed = query.trim()

  useEffect(() => {
    if (!categoryDrawerOpen) {
      setIsSearchOpen(false)
      setQuery("")
    }
  }, [categoryDrawerOpen])

  function handleAccordionValueChange(next: unknown[]) {
    if (next.length === 0) {
      setOpenCategoryId(null)
      return
    }
    const newlyOpened = next.find((v) => v !== openCategoryId)
    setOpenCategoryId((newlyOpened ?? next[0]) as string)
  }

  function goToResultsPage() {
    if (!trimmed) return
    setCategoryDrawerOpen(false)
    navigate(`/search?q=${encodeURIComponent(trimmed)}`)
  }

  function handleOpenChat() {
    setCategoryDrawerOpen(false)
    openChatPanel()
  }

  return (
    <Sheet open={categoryDrawerOpen} onOpenChange={setCategoryDrawerOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon" className="size-11 lg:hidden" />}>
        <MenuIcon />
        <span className="sr-only">Open menu</span>
      </SheetTrigger>
      <SheetContent side="right" showCloseButton={false} className="w-full gap-0 p-0 sm:max-w-sm">
        <SheetTitle className="sr-only">PAKCLAY.COM menu</SheetTitle>

        {isSearchOpen ? (
          <>
            <div className="flex items-center gap-2 border-b border-border p-4">
              <Button
                variant="ghost"
                size="icon"
                className="size-11 shrink-0"
                onClick={() => setIsSearchOpen(false)}
                aria-label="Back to menu"
              >
                <ArrowLeftIcon />
              </Button>
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") goToResultsPage()
                }}
                placeholder="Search khaprail, disco tile..."
                aria-label="Search products"
                className="h-10 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex flex-1 flex-col overflow-y-auto px-2 py-2">
              {trimmed === "" ? null : searchLoading ? (
                <div className="flex flex-col gap-2 p-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : results.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No results for &ldquo;{trimmed}&rdquo;</p>
              ) : (
                <ul role="listbox" aria-label="Search results">
                  {results.map((product) => (
                    <li key={product.id} role="option" aria-selected={false}>
                      <SheetClose
                        nativeButton={false}
                        render={<Link to={`/products/${product.slug}`} className="flex items-center gap-3 rounded-lg p-2 active:bg-muted" />}
                      >
                        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-white">
                          {product.cover_image_url && (
                            <StorageImage
                              src={product.cover_image_url}
                              alt=""
                              width={48}
                              height={48}
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-base font-medium text-foreground">{product.name}</span>
                          {product.category_name && (
                            <span className="truncate text-sm text-muted-foreground">{product.category_name}</span>
                          )}
                        </div>
                        {product.price != null && (
                          <span className="shrink-0 text-sm font-semibold text-price">PKR {product.price.toLocaleString()}</span>
                        )}
                      </SheetClose>
                    </li>
                  ))}
                </ul>
              )}

              {trimmed !== "" && (
                <SheetClose
                  nativeButton={false}
                  render={
                    <Link
                      to={`/search?q=${encodeURIComponent(trimmed)}`}
                      className="mt-2 block rounded-lg p-3 text-center text-base font-medium text-primary active:bg-muted"
                    />
                  }
                >
                  View all results for &ldquo;{trimmed}&rdquo;
                </SheetClose>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-border p-4">
              <SheetClose render={<Button variant="ghost" size="icon" className="size-11" />}>
                <XIcon />
                <span className="sr-only">Close menu</span>
              </SheetClose>
              <span className="font-heading text-xl font-bold text-primary">PAKCLAY.COM</span>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto size-11"
                onClick={() => setIsSearchOpen(true)}
                aria-label="Search"
              >
                <SearchIcon />
              </Button>
              <button
                type="button"
                onClick={handleOpenChat}
                aria-label="Ask the AI assistant"
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground outline-none transition-transform active:scale-95"
              >
                <SparklesIcon className="size-4" />
              </button>
            </div>

            <nav className="flex flex-1 flex-col overflow-y-auto px-4 py-2">
              {isLoading ? (
                <div className="flex flex-col gap-2 py-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-11 w-full" />
                  ))}
                </div>
              ) : error || roots.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">Categories coming soon.</p>
              ) : (
                <Accordion
                  value={openCategoryId ? [openCategoryId] : []}
                  onValueChange={handleAccordionValueChange}
                >
                  {roots.map((category) => {
                    const children = getCategoryChildren(categories, category.id)
                    if (children.length === 0) {
                      return (
                        <div key={category.id} className="border-b border-border last:border-b-0">
                          <SheetClose
                            nativeButton={false}
                            render={
                              <Link
                                to={`/categories/${category.slug}`}
                                className="flex min-h-12 w-full items-center py-2.5 text-base font-medium"
                              />
                            }
                          >
                            {category.name}
                          </SheetClose>
                        </div>
                      )
                    }
                    return (
                      <AccordionItem key={category.id} value={category.id}>
                        <AccordionTrigger className="min-h-12 text-base font-medium">
                          {category.name}
                        </AccordionTrigger>
                        <AccordionContent>
                          <ul className="flex flex-col gap-1 pb-2 pl-3">
                            {children.map((child) => (
                              <li key={child.id}>
                                <SheetClose
                                  nativeButton={false}
                                  render={
                                    <Link
                                      to={`/categories/${child.slug}`}
                                      className="flex min-h-10 items-center text-sm text-muted-foreground hover:text-foreground"
                                    />
                                  }
                                >
                                  {child.name}
                                </SheetClose>
                              </li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    )
                  })}
                </Accordion>
              )}

              <SheetClose
                nativeButton={false}
                render={
                  <Link
                    to="/downloads"
                    className="mt-3 flex items-center gap-3 rounded-xl bg-secondary px-4 py-3 text-base font-semibold text-secondary-foreground"
                  />
                }
              >
                <DownloadIcon className="size-5 shrink-0" />
                Download Catalogue
              </SheetClose>

              <SheetClose
                nativeButton={false}
                render={
                  <Link
                    to="/blog"
                    className="flex min-h-12 items-center border-b border-border py-2.5 text-base font-medium"
                  />
                }
              >
                Blog
              </SheetClose>

              <Button
                className="mt-4 h-12 w-full text-lg"
                nativeButton={false}
                render={<a href={buildWhatsAppUrl(DEFAULT_WHATSAPP_MESSAGE)} target="_blank" rel="noreferrer" />}
              >
                Get a Sample
              </Button>
            </nav>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"

// Renders a blog post's `content` field (stored as Markdown by the admin
// editor) as real, styled HTML. react-markdown is safe by default: it builds
// React elements (never raw innerHTML), does not render embedded HTML, and
// its default `urlTransform` strips unsafe protocols such as `javascript:`,
// so admin-authored content cannot inject script. Every element is mapped to
// the site's existing type scale (Gilroy headings via `font-heading`,
// `text-lg` body at relaxed leading, primary-colour links) so no unstyled
// browser defaults show through.

const headingBase = "font-heading font-semibold text-foreground scroll-mt-24"

const components: Components = {
  // The post title is the page's <h1>; a "#" inside the body becomes an <h2>
  // so a post never ends up with two h1 elements.
  h1: ({ node: _node, className: _c, ...props }) => (
    <h2 className={cn(headingBase, "mt-6 text-3xl sm:text-4xl")} {...props} />
  ),
  h2: ({ node: _node, className: _c, ...props }) => (
    <h2 className={cn(headingBase, "mt-6 text-3xl sm:text-4xl")} {...props} />
  ),
  h3: ({ node: _node, className: _c, ...props }) => (
    <h3 className={cn(headingBase, "mt-4 text-2xl sm:text-3xl")} {...props} />
  ),
  h4: ({ node: _node, className: _c, ...props }) => (
    <h4 className={cn(headingBase, "mt-3 text-xl sm:text-2xl")} {...props} />
  ),
  h5: ({ node: _node, className: _c, ...props }) => (
    <h5 className={cn(headingBase, "mt-2 text-lg")} {...props} />
  ),
  h6: ({ node: _node, className: _c, ...props }) => (
    <h6 className={cn(headingBase, "mt-2 text-base")} {...props} />
  ),
  p: ({ node: _node, ...props }) => <p {...props} />,
  strong: ({ node: _node, ...props }) => <strong className="font-semibold" {...props} />,
  em: ({ node: _node, ...props }) => <em className="italic" {...props} />,
  hr: ({ node: _node, ...props }) => <hr className="my-4 border-border" {...props} />,
  ul: ({ node: _node, ...props }) => <ul className="list-disc space-y-2 pl-6 marker:text-primary" {...props} />,
  ol: ({ node: _node, ...props }) => <ol className="list-decimal space-y-2 pl-6 marker:font-semibold marker:text-primary" {...props} />,
  li: ({ node: _node, ...props }) => <li className="pl-1" {...props} />,
  blockquote: ({ node: _node, ...props }) => (
    <blockquote className="border-l-4 border-primary/40 pl-4 italic text-muted-foreground" {...props} />
  ),
  a: ({ node: _node, href, children, ...props }) => {
    const linkClass = "font-medium text-primary underline underline-offset-4 hover:text-primary/80"
    if (!href) return <span {...props}>{children}</span>
    // Internal site links use the router (no full page reload); anchors and
    // everything else are plain links, external ones opening in a new tab.
    if (href.startsWith("/") && !href.startsWith("//")) {
      return (
        <Link to={href} className={linkClass}>
          {children}
        </Link>
      )
    }
    const isExternal = /^https?:\/\//i.test(href)
    return (
      <a
        href={href}
        className={linkClass}
        {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        {...props}
      >
        {children}
      </a>
    )
  },
  img: ({ node: _node, alt, src, ...props }) => (
    <img
      src={src}
      alt={alt ?? ""}
      loading="lazy"
      decoding="async"
      className="my-2 block h-auto w-full rounded-xl"
      {...props}
    />
  ),
  pre: ({ node: _node, ...props }) => (
    <pre className="overflow-x-auto rounded-xl bg-muted p-4 text-sm leading-relaxed" {...props} />
  ),
  code: ({ node: _node, className, ...props }) => (
    <code
      className={cn("rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em] [pre_&]:bg-transparent [pre_&]:p-0", className)}
      {...props}
    />
  ),
  table: ({ node: _node, ...props }) => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-base" {...props} />
    </div>
  ),
  th: ({ node: _node, ...props }) => <th className="border-b border-border px-3 py-2 font-semibold" {...props} />,
  td: ({ node: _node, ...props }) => <td className="border-b border-border px-3 py-2" {...props} />,
}

export function MarkdownContent({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-5 text-lg leading-relaxed text-foreground", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  )
}

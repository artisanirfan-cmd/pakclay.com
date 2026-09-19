import { Link, useParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { StorageImage } from "@/components/shared/storage-image"
import { FaqAccordion } from "@/components/blog/faq-accordion"
import { MarkdownContent } from "@/components/blog/markdown-content"
import { RelatedTiles } from "@/components/blog/related-tiles"
import { useBlogPost } from "@/hooks/use-blog-post"
import { JsonLd } from "@/components/seo/json-ld"
import { useDocumentHead } from "@/hooks/use-document-head"
import { blogPostingJsonLd, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo/json-ld"
import { shareImage } from "@/lib/seo/image"
import { cleanText, truncateAtWord } from "@/lib/seo/text"
import { stripMarkdown } from "@/lib/markdown"

// /blog/:slug (06-BLOG-CMS-SPEC.md): cover image, title, author/read-time,
// Answer Box near the top (for human skimmers and AI crawlers), content,
// FAQ accordion, Article + FAQPage JSON-LD.
export function BlogPost() {
  const { slug } = useParams<{ slug: string }>()
  const { post, isLoading, error } = useBlogPost(slug)

  // Title/description come from the post's SEO tab fields (meta_title /
  // meta_description) when the author set them, else the title / excerpt.
  useDocumentHead(
    post
      ? {
          title: cleanText(post.meta_title) || truncateAtWord(cleanText(post.title), 46),
          description:
            truncateAtWord(cleanText(post.meta_description) || cleanText(post.excerpt) || cleanText(post.answer_box), 155) ||
            `Read "${post.title}" on the ${post.category ?? "tile"} blog.`,
          path: `/blog/${post.slug}`,
          image: shareImage(post.cover_image_url, 630),
          imageAlt: post.title,
          type: "article",
          article: { publishedTime: post.published_at, modifiedTime: post.published_at, section: post.category?.trim(), tags: post.entity_tags },
        }
      : null,
  )

  if (isLoading) {
    return (
      <main className="min-h-svh flex-1">
        <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
          <Skeleton className="aspect-[16/9] w-full rounded-xl" />
          <Skeleton className="mt-6 h-8 w-2/3" />
          <Skeleton className="mt-4 h-24 w-full" />
        </div>
      </main>
    )
  }

  if (error || !post) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-2 px-6 py-24 text-center">
        <h1 className="font-heading text-2xl">Post not found</h1>
        <p className="text-sm text-muted-foreground">We couldn't find that post. Browse the blog instead.</p>
        <Button className="mt-4" nativeButton={false} render={<Link to="/blog" />}>
          View All Posts
        </Button>
      </main>
    )
  }

  const structuredData = [
    blogPostingJsonLd(post),
    faqJsonLd(post),
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Blog", path: "/blog" },
      { name: post.title, path: `/blog/${post.slug}` },
    ]),
  ]

  return (
    <main className="flex-1">
      <JsonLd data={structuredData} />

      <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
        {post.cover_image_url && (
          <div className="mb-8 flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-xl bg-muted">
            <StorageImage
              src={post.cover_image_url}
              alt={post.title}
              width={672}
              height={378}
              priority
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <h1 className="font-heading text-6xl font-semibold sm:text-7xl">{post.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {[post.author, post.read_time_minutes ? `${post.read_time_minutes} min read` : null]
            .filter(Boolean)
            .join(" · ")}
        </p>

        {post.answer_box && (
          <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-5">
            <p className="text-foreground">{stripMarkdown(post.answer_box)}</p>
          </div>
        )}

        <MarkdownContent className="mt-8">{post.content ?? ""}</MarkdownContent>

        <RelatedTiles post={post} />

        <FaqAccordion faqs={post.blog_faqs} />
      </div>
    </main>
  )
}

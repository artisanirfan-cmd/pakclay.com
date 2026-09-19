import { Link } from "react-router-dom"
import { useBlogPosts } from "@/hooks/use-blog-posts"
import { overlap, postKeywords } from "@/lib/related-content"
import { cleanText, truncateAtWord } from "@/lib/seo/text"

// "From the blog" — internal links from a category or product page to the
// published posts that are actually about it, matched on real keywords
// (lib/related-content.ts). Renders nothing when no post relates.
export function RelatedPosts({ keywords }: { keywords: Set<string> }) {
  const { posts } = useBlogPosts()

  const related = posts
    .map((post) => ({ post, score: overlap(keywords, postKeywords(post)) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((x) => x.post)

  if (related.length === 0) return null

  return (
    <section aria-labelledby="related-posts-heading" className="mt-12 border-t border-border pt-8">
      <h2 id="related-posts-heading" className="font-heading text-3xl font-semibold">
        From the blog
      </h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2">
        {related.map((post) => (
          <li key={post.id}>
            <Link to={`/blog/${post.slug}`} className="group/post flex h-full flex-col gap-1 rounded-xl border border-border p-4 transition-colors hover:bg-muted">
              <span className="font-heading text-xl font-semibold text-foreground group-hover/post:underline">{post.title}</span>
              {post.excerpt && <span className="text-sm text-muted-foreground">{truncateAtWord(cleanText(post.excerpt), 140)}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

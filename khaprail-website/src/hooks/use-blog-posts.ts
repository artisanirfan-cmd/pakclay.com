import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { BlogPost } from "@/types/blog"

interface UseBlogPostsResult {
  posts: BlogPost[]
  isLoading: boolean
  error: string | null
}

const COLUMNS =
  "id, title, slug, cover_image_url, category, entity_tags, author, read_time_minutes, excerpt, status, published_at, created_at"

/** /blog index — published posts only (RLS enforces this too; see blog_posts policies). */
export function useBlogPosts(): UseBlogPostsResult {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [isLoading, setIsLoading] = useState(() => supabase !== null)
  const [error, setError] = useState<string | null>(() =>
    supabase ? null : "Supabase project not configured yet"
  )

  useEffect(() => {
    if (!supabase) return

    let cancelled = false

    supabase
      .from("blog_posts")
      .select(COLUMNS)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .then(({ data, error: queryError }) => {
        if (cancelled) return
        if (queryError) {
          setError(queryError.message)
        } else {
          setPosts((data ?? []) as unknown as BlogPost[])
        }
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { posts, isLoading, error }
}

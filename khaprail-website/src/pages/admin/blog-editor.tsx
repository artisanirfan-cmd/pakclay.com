import { useEffect, useRef, useState, type FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { CoverImageDropzone } from "@/components/admin/ImageDropzone"
import { ContentImageInserter } from "@/components/admin/ContentImageInserter"
import { useAdminBlogPost } from "@/hooks/use-admin-blog-post"
import { saveBlogPost, faqsFromBlogFaqs, type FaqDraft } from "@/lib/blog-admin"
import { getErrorMessage, slugify } from "@/lib/utils"
import { insertBlockAtSelection } from "@/lib/markdown"
import type { BlogPostFormValues } from "@/types/blog"

const EMPTY_VALUES: BlogPostFormValues = {
  title: "",
  slug: "",
  cover_image_url: null,
  category: null,
  author: null,
  read_time_minutes: null,
  excerpt: null,
  content: null,
  focus_keyword: null,
  meta_title: null,
  meta_description: null,
  answer_box: null,
  ai_summary: null,
  entity_tags: [],
  status: "draft",
  published_at: null,
}

// /admin/blog/new and /admin/blog/:id/edit — the tabbed editor from
// 06-BLOG-CMS-SPEC.md (Content / SEO / AEO-GEO / FAQs). Auth-gated by
// ProtectedRoute (batch 9).
export function AdminBlogEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { post, isLoading } = useAdminBlogPost(id)

  const [values, setValues] = useState<BlogPostFormValues>(EMPTY_VALUES)
  const [entityTagsInput, setEntityTagsInput] = useState("")
  const [faqs, setFaqs] = useState<FaqDraft[]>([])
  const [isSaving, setIsSaving] = useState(false)
  // Where the cursor was in the Full Content textarea, so "Insert Image" can
  // drop the image there even after focus has moved to the alt-text field.
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const contentSelection = useRef<{ start: number; end: number } | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (!post) return
    const { id: _id, created_at: _createdAt, blog_faqs, ...formValues } = post
    setValues(formValues)
    setEntityTagsInput(post.entity_tags.join(", "))
    setFaqs(faqsFromBlogFaqs(blog_faqs))
  }, [post])

  function updateField<K extends keyof BlogPostFormValues>(key: K, value: BlogPostFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function handleTitleBlur() {
    if (!values.slug && values.title) updateField("slug", slugify(values.title))
  }

  function updateFaq(index: number, field: keyof FaqDraft, value: string) {
    setFaqs((prev) => prev.map((faq, i) => (i === index ? { ...faq, [field]: value } : faq)))
  }

  function addFaq() {
    setFaqs((prev) => [...prev, { question: "", answer: "" }])
  }

  function removeFaq(index: number) {
    setFaqs((prev) => prev.filter((_, i) => i !== index))
  }

  function handleInsertImage(markdown: string) {
    const current = values.content ?? ""
    const selection = contentSelection.current ?? { start: current.length, end: current.length }
    const { value, cursor } = insertBlockAtSelection(current, selection.start, selection.end, markdown)
    updateField("content", value)
    contentSelection.current = { start: cursor, end: cursor }
    requestAnimationFrame(() => {
      const el = contentRef.current
      if (!el) return
      el.focus()
      el.setSelectionRange(cursor, cursor)
    })
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setIsSaving(true)
    setSaveError(null)

    const effectiveValues: BlogPostFormValues = {
      ...values,
      entity_tags: entityTagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      published_at: values.status === "published" ? (values.published_at ?? new Date().toISOString()) : values.published_at,
    }

    try {
      const savedId = await saveBlogPost(effectiveValues, faqs, id ?? null)
      navigate(`/admin/blog/${savedId}/edit`)
    } catch (err) {
      setSaveError(getErrorMessage(err, "Failed to save post"))
    } finally {
      setIsSaving(false)
    }
  }

  if (id && isLoading) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-4 h-64 w-full" />
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-heading text-3xl">{id ? "Edit Post" : "New Post"}</h1>
        <Link to="/admin/blog" className="text-sm text-muted-foreground hover:underline">
          Back to all posts
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Tabs defaultValue="content">
          <TabsList className="w-full">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="aeo-geo">AEO/GEO</TabsTrigger>
            <TabsTrigger value="faqs">FAQs</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="mt-4 flex flex-col gap-4">
            <Field label="Title">
              <Input
                required
                value={values.title}
                onBlur={handleTitleBlur}
                onChange={(e) => updateField("title", e.target.value)}
              />
            </Field>
            <Field label="Slug">
              <Input required value={values.slug} onChange={(e) => updateField("slug", e.target.value)} />
            </Field>
            <div className="max-w-sm">
              <CoverImageDropzone
                value={values.cover_image_url}
                onChange={(url) => updateField("cover_image_url", url)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Category">
                <Input
                  value={values.category ?? ""}
                  onChange={(e) => updateField("category", e.target.value || null)}
                />
              </Field>
              <Field label="Author">
                <Input
                  value={values.author ?? ""}
                  onChange={(e) => updateField("author", e.target.value || null)}
                />
              </Field>
            </div>
            <Field label="Read Time (minutes)">
              <Input
                type="number"
                min={0}
                value={values.read_time_minutes ?? ""}
                onChange={(e) => updateField("read_time_minutes", e.target.value ? Number(e.target.value) : null)}
              />
            </Field>
            <Field label="Excerpt">
              <Textarea
                value={values.excerpt ?? ""}
                onChange={(e) => updateField("excerpt", e.target.value || null)}
              />
            </Field>
            <Field label="Full Content">
              <Textarea
                ref={contentRef}
                className="min-h-64 font-mono text-sm"
                value={values.content ?? ""}
                onChange={(e) => updateField("content", e.target.value || null)}
                onSelect={(e) => {
                  const { selectionStart, selectionEnd } = e.currentTarget
                  contentSelection.current = { start: selectionStart, end: selectionEnd }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Written in Markdown: <code>## Heading</code>, <code>**bold**</code>, <code>[text](url)</code>,{" "}
                <code>- list</code>, <code>1. list</code>, <code>---</code> for a divider.
              </p>
              <ContentImageInserter onInsert={handleInsertImage} />
            </Field>
            <Field label="Status">
              <Select value={values.status} onValueChange={(v) => v && updateField("status", v as "draft" | "published")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </TabsContent>

          <TabsContent value="seo" className="mt-4 flex flex-col gap-4">
            <Field label="Focus Keyword">
              <Input
                value={values.focus_keyword ?? ""}
                onChange={(e) => updateField("focus_keyword", e.target.value || null)}
              />
            </Field>
            <Field label="Meta Title">
              <Input
                value={values.meta_title ?? ""}
                onChange={(e) => updateField("meta_title", e.target.value || null)}
              />
            </Field>
            <Field label="Meta Description">
              <Textarea
                value={values.meta_description ?? ""}
                onChange={(e) => updateField("meta_description", e.target.value || null)}
              />
            </Field>
          </TabsContent>

          <TabsContent value="aeo-geo" className="mt-4 flex flex-col gap-4">
            <Field label="Answer Box">
              <Textarea
                value={values.answer_box ?? ""}
                onChange={(e) => updateField("answer_box", e.target.value || null)}
              />
            </Field>
            <Field label="AI Summary">
              <Textarea
                value={values.ai_summary ?? ""}
                onChange={(e) => updateField("ai_summary", e.target.value || null)}
              />
            </Field>
            <Field label="Entity Tags (comma-separated)">
              <Input value={entityTagsInput} onChange={(e) => setEntityTagsInput(e.target.value)} />
            </Field>
          </TabsContent>

          <TabsContent value="faqs" className="mt-4 flex flex-col gap-4">
            {faqs.map((faq, index) => (
              <div key={index} className="flex flex-col gap-2 rounded-lg border border-border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">FAQ {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeFaq(index)}
                    className="text-sm text-muted-foreground hover:text-destructive"
                  >
                    Remove
                  </button>
                </div>
                <Input
                  placeholder="Question"
                  value={faq.question}
                  onChange={(e) => updateFaq(index, "question", e.target.value)}
                />
                <Textarea
                  placeholder="Answer"
                  value={faq.answer}
                  onChange={(e) => updateFaq(index, "answer", e.target.value)}
                />
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addFaq} className="w-fit">
              Add FAQ
            </Button>
          </TabsContent>
        </Tabs>

        {saveError && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {saveError}
          </p>
        )}

        <Button type="submit" size="lg" className="w-fit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Post"}
        </Button>
      </form>
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  )
}

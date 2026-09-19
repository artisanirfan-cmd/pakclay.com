# 06 — Blog & SEO/AEO/GEO CMS Spec

Mirror the exact field structure already used for the SylJo Tech blog CMS (`syljo-blog-writer` system) so Sylvester's existing content workflow transfers directly to this site.

## Admin editor — tabs

**Content Tab**
- Title
- Slug
- Cover Image (drag-and-drop upload to Supabase Storage, permanent public URL)
- Category
- Author
- Read Time
- Excerpt
- Full Content (Markdown - rendered to styled HTML on the public post; "Insert Image" uploads a file and inserts `![alt](url)` at the cursor, alt text required)

**SEO Tab**
- Focus Keyword
- Meta Title
- Meta Description

**AEO/GEO Tab** (Answer Engine Optimization / Generative Engine Optimization — for AI assistants like ChatGPT/Claude/Perplexity surfacing this content)
- Answer Box — a direct-answer snippet an AI assistant could quote/summarize
- AI Summary — a short structured summary of the post
- Entity Tags — key entities/terms this post is about (e.g. "khaprail tiles," "clay roof tiles Lahore," "terracotta")

**FAQs Tab**
- 5 Q&A pairs, ready to paste, rendered as FAQPage schema on the live post

## Public post page

- Render Article JSON-LD schema using the SEO tab fields
- Render FAQPage JSON-LD schema using the FAQs tab
- Surface the Answer Box prominently near the top of the post (both for human skimmers and AI crawlers)
- Standard blog post layout: cover image, title, author/read-time, content, FAQ accordion at the bottom

## Data model (Supabase, sketch)

```
blog_posts (id, title, slug, cover_image_url, category, author, read_time,
            excerpt, content, focus_keyword, meta_title, meta_description,
            answer_box, ai_summary, entity_tags[], published_at, status)
blog_faqs (id, post_id, question, answer, sort_order)
```

-- Product SEO fields (2026-11-27, SylJo Tech). Run once in the Supabase SQL editor.
-- Filled by the SEO publisher from khaprail-website/content/products/seo/<slug>.json.
-- All columns are nullable; the site falls back to its old behaviour when they are empty.
alter table public.products
  add column if not exists seo_title text,
  add column if not exists meta_description text,
  add column if not exists focus_keyword text,
  add column if not exists secondary_keywords text[],
  add column if not exists faqs jsonb,
  add column if not exists image_alt text,
  add column if not exists seo_updated_at timestamptz;

-- The public site reads these with the anon key, like the other product columns
-- (products already has a public SELECT policy; column additions inherit it).
comment on column public.products.faqs is 'Array of {q, a} objects shown as FAQs + FAQPage JSON-LD on the product page';

# PAKCLAY.COM — 30-day SEO / AEO / GEO plan (starts 2026-11-07)

Goal: rank pakclay.com for "khaprail / terracotta / clay tile" searches by city, by product and by price intent, and get cited by AI answers (Google AI Overviews, ChatGPT, Perplexity). Output: 2 articles/day (60), 3-4 product pages/day optimized (all 99 products), schema and internal links on every piece.

## 1. What the research found (2026-11-06, web search + page reads)
- The tile SERPs in Pakistan are weak. Zameen's roofing-tile guide (2020) never mentions "khaprail", gives no prices and no lifespan figures. Zameen's floor-tile rates article (Aug 2023) covers only ceramic, porcelain and granite: nothing on terracotta, clay or Multani.
- The one close competitor article found for "Khaprail Tiles in Lahore" is ~300-350 words, one undated price range with no unit basis, no FAQ, no installation or load specs, generic claims, no internal links. Easy to beat with depth.
- Other results are B2B directories and marketplaces (GlobalLinker, IndiaMART, TradeIndia, Alibaba, Indian McCoy Mart listings), which are thin or foreign and rarely local-intent.
- pakclaytiles.com is the older site of the same company (Pak Clay Industry, Lahore + Islamabad). It uses the pattern "[product] + price / in Pakistan / in [city]" with city tags (Lahore, Islamabad, Karachi, Faisalabad, Peshawar, Quetta, Multan, Gujranwala, Sargodha...), and shows no real prices. **Do not copy its text** (duplicate content between two domains hurts both). Each pakclay.com article is written fresh; where useful it can link to nothing on the old site.
- Nobody in the results answers: real price drivers with units and dates, climate-by-city advice (monsoon Lahore, coastal Karachi, snow Murree), installation basics, how many tiles per roof area, clay vs concrete for Pakistan.

Caveat: no keyword-volume tool is connected. Priorities below come from SERP gaps and the "[product] + city/price" patterns seen in the results, not measured volumes. Verify in Google Search Console after ~2 weeks and re-rank the calendar.

## 2. Keyword framework
| Layer | Pattern | Examples |
|---|---|---|
| City x product | best / [product] in [city] | best khaprail tiles in lahore, khaprail tiles in karachi, terracotta tiles in peshawar |
| Price | [product] price in [pakistan/city] | khaprail tiles price in pakistan, terracotta tiles price in karachi, gutka tiles price |
| Product | type, colour, size, design | khaprail tiles colors, terracotta jali designs, otti tiles |
| Use case | where it goes | car porch tiles, terrace tiles lahore, kitchen wall terracotta |
| How-to / care | install, calculate, maintain, leaks | how many khaprail tiles per sq ft, khaprail leakage |
| Comparison | X vs Y | clay vs concrete roof tiles pakistan, natural vs glazed terracotta |
| B2B | bulk, architects, contractors | bulk khaprail tiles pakistan |
| Trust (E-E-A-T) | history, factory, since 1982 | history of khaprail tiles lahore |

Cities in the calendar: Lahore, Karachi, Islamabad, Rawalpindi, Faisalabad, Multan, Gujranwala/Sialkot, Peshawar, Quetta, Hyderabad, Murree (climate angle). Full keyword list per article is in `calendar.json`.

## 3. Pricing rule (honest data)
There is no confirmed price list yet. Articles on price explain what sets the rate (size, profile, glaze, quantity, distance, season) and how to get a quote, and quote a number **only** if it is filled in `price-sheet.json` with its unit and date. Never use a competitor's undated range as ours. **Action for the client: fill `price-sheet.json`.** Once filled, the price articles are refreshed with real figures (they are the highest-intent pages).

## 4. Article standard (same system as the SylJo Tech blog)
Fields: title (<=65), slug, cover image, category, author, read time, excerpt (<=160), full Markdown content, focus keyword, meta title (<=60), meta description (<=155), answer box (40-60 words), AI summary (2-3 sentences), 8 entity tags, 5 FAQs (one on cost, one comparison, one next step). Body 1,100-1,500 words: hook that names the city, problem, local context, how it works, comparison/numbers only when sourced, "why Pak Clay" (since 1982, Lahore workshop, Lahore + Islamabad offices, free samples), bottom line + CTA.
Rules: no invented statistics, test results, awards, customer names or prices. General claims are hedged ("typically", "tends to"). Every article links to 2-4 real internal URLs (products, categories, /contact) and ends with the WhatsApp sample CTA. No keyword stuffing; the keyword appears in title, first 100 words, one heading, meta and slug. Avoid the words: game-changing, revolutionary, cutting-edge, delve, leverage, "in today's fast-paced world".

## 5. AEO / GEO checklist (every article)
- Answer box that answers the query in 40-60 words, first sentence direct.
- Question-style H2s that match how people ask ("Are khaprail tiles waterproof?").
- 5 FAQs with FAQPage JSON-LD (already rendered by the blog post page), plus Article JSON-LD and breadcrumb.
- Entity tags: Pak Clay Tiles, Khaprail Tiles, Lahore, Pakistan, the city, the product, the material.
- Consistent NAP (name, address, phone) from the site footer: Lahore Walton Road opposite Packages Mall Gate 2; Islamabad G-04 Civic Center, Gulberg Greens; +92 300 4617715.
- Short, quotable definition sentences and tables where data exists, so AI engines can lift them.
- Fresh sitemap: /sitemap.xml is generated live from the database, so each published article appears automatically.

## 6. Product optimization (all 99 products)
Finding: **all 99 products still carry the placeholder description** ("Imported from real product photography - needs a full description from Khaprail"). The product page hides it, so product pages have no real text. 3-4 products/day get a real description (60-120 words) written only from verified facts: name, size, shape, material, category, photo, and general facts about terracotta/clay or ceramic. No invented specs (weight, strength, water absorption) unless Khaprail supplies them. Each description mentions the use (indoor, outdoor, roof, wall), the look, and the free-sample WhatsApp path. Schedule: `products.json` (grouped by family; khaprail roof first, jali last). Patches are written to `khaprail-website/content/products/<date>.json` and applied by the publisher (only where the description is still the placeholder).
Also on product pages: alt text, link from the matching city/use article, and "Similar products" stay as they are.

## 7. Locality pages
Each city gets at least one article (calendar). Extra locality GEO steps: add `areaServed` cities to the business JSON-LD and a "Cities we deliver to" line on /contact once delivery coverage is confirmed by the client (do not claim cities we do not serve).

## 8. How it runs
- Daily scheduled task (04:30 PKT): reads `calendar.json`, researches the day's two keywords (SERP check), writes both articles into `khaprail-website/content/blog/queue/` and the day's product descriptions into `content/products/`, updates the calendar status, commits and pushes.
- Publisher (server job, hourly): publishes each queued article when its `publish_at` time is due, applies product patches, skips anything already live. Needs `SUPABASE_SERVICE_ROLE_KEY` (already set for the chatbot) and a deploy of the pushed files. See `RUNBOOK.md`.
- Publish times: 09:00 and 15:00 PKT.

## 9. Measure (from day 14)
Google Search Console: impressions/clicks per article and per city term; indexed pages; average position for the 10 core terms. Re-order the calendar toward what is getting impressions. Count sample requests (`sample_inquiries`) per article source when attribution is added.

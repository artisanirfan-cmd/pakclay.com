# SEO automation runbook

Flow: daily scheduled task (writes files, pushes to GitHub) -> server publisher (hourly, publishes due items to Supabase).

Files the task writes each day (day N in `seo/calendar.json`):
- `khaprail-website/content/blog/queue/<slug>.json` + `<slug>.md`  (publish_at 09:00 / 15:00 PKT on the calendar date)
- `khaprail-website/content/products/<date>.json`  ([{slug, description}], applied only where description is still the import placeholder)
- statuses in `seo/calendar.json` and `seo/products.json` set to "queued"

Server env (Hostinger hPanel):
- `SUPABASE_SERVICE_ROLE_KEY` (already set), `VITE_SUPABASE_URL`
- `PUBLISH_MODE=draft` to save as drafts for review (default: published)
- `SEO_GITHUB_REPO=artisanirfan-cmd/pakclay.com` (+ `SEO_GITHUB_TOKEN` if private) to read the queue straight from GitHub so no redeploy is needed. Without it, the publisher reads files bundled in the deployed build.
- `SEO_PUBLISHER=off` to disable.

Idempotent: an article whose slug already exists is skipped; edit it in /admin/blog afterwards.

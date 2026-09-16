# foodie

Shared toddler meal-prep tracker for two parents and a helper. Full spec: see `Meal plan app.md` in the "baby meal prep" project notes.

**Stack:** React + Vite (PWA), Supabase (Postgres + Auth + Storage + Realtime + Edge Functions), Telegram bot for notifications, deployed to GitHub Pages.

## Local dev

```bash
npm install
cp .env.example .env.local   # fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm run dev
```

## Deploy

Pushing to `main` builds and deploys to GitHub Pages via `.github/workflows/deploy.yml`. One-time setup needed in the GitHub repo settings:
- **Settings → Pages → Source:** GitHub Actions
- **Settings → Secrets and variables → Actions:** add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

## Roadmap

### M0 — Project scaffolding
- [ ] Init frontend: React + Vite
- [ ] Supabase project (free tier), local `supabase` CLI + migrations folder
- [ ] GitHub Pages deploy pipeline (GitHub Actions build+deploy on push to main)
- [ ] Env/config for Supabase URL+anon key in a static-safe way

### M1 — Schema & auth
- [ ] Migrations for `users`, `children`, `recipes`, `batches`, `serving_events`, `app_settings`
- [ ] RLS policies: all 3 users equal read/write on core tables; `app_settings` write gated to `role = admin`; hard delete gated to admin
- [ ] Postgres function for atomic portion decrement/restore (serve + undo)
- [ ] Supabase Auth: 3 manually-created accounts, email/password or magic link, no signup UI
- [ ] Seed script: 3 users (2 parent personas, 1 helper), 1 child (Hazel)

### M2 — Recipes
- [ ] Recipe list + detail view
- [ ] Add/edit recipe form: title, ingredients (name/qty/unit, repeatable rows), instructions, notes

### M3 — Batch logging (helper)
- [ ] Recipe picker → portions-made input → camera capture → client-side resize/compress (≤1000px, JPEG/WebP ~70-80%) → preview/retake → upload to private Storage bucket → insert `batches` row
- [ ] Signed-URL fetch for displaying batch photos (never store/display raw public URLs)

### M4 — Serving flow (helper)
- [ ] Batch picker → portion stepper → 1-5 rating tap targets → optional note → save
- [ ] One-handed UI constraint: large targets, no required free text
- [ ] Wires into the atomic decrement function from M1

### M5 — Undo/delete
- [ ] Void (soft delete) on any batch/serving_event, no time limit, any user, restores portion counts
- [ ] Hard delete, admin-only, separate confirmation

### M6 — Parent dashboard
- [ ] Freezer view: portions remaining grouped child → recipe → batch, photo + prep date
- [ ] History view: chronological serving feed, voided entries excluded but not deleted
- [ ] Supabase Realtime subscriptions so both views update live
- [ ] Child-selector skipped when only 1 child exists

### M7 — Telegram notifications
- [ ] Bot creation + chat-id linking flow, store on `users.telegram_chat_id`
- [ ] Supabase Edge Function(s) triggered on `batches`/`serving_events` insert and on `portions_remaining` crossing `app_settings.low_stock_threshold`
- [ ] Admin-only settings screen to edit the threshold

### M8 — Ops
- [ ] Keepalive ping (GitHub Actions cron or UptimeRobot) so the Supabase free project doesn't pause after 7 days idle
- [ ] PWA manifest/icons for home-screen install on all 3 phones

# foodie

Shared toddler meal-prep tracker for two parents and a helper. Full spec: see `Meal plan app.md` in the "baby meal prep" project notes.

**Stack:** React + Vite (PWA), Supabase (Postgres + Auth + Storage + Realtime + Edge Functions), Telegram bot for notifications, deployed to GitHub Pages.

## Local dev

```bash
npm install
npm run dev
```

No Supabase project needed to develop — see "Data layer" below.

## Data layer

Feature code only ever imports from [`src/lib/data/index.js`](src/lib/data/index.js), never from a specific backend. Which backend it loads is picked by `VITE_DATA_BACKEND`:

- **`local`** (default, no env setup required): browser-only mock — records in `localStorage`, photo blobs in IndexedDB, no network. Seeded with the 3 users from the spec and one child (Hazel). "Logged in as" is a plain dropdown (`setCurrentUser`), since there's no real auth backend yet. Good for building/clicking through every flow, but it's single-browser only — it can't test real multi-device sync, RLS, or Realtime.
- **`supabase`**: the real backend ([`src/lib/data/supabaseBackend.js`](src/lib/data/supabaseBackend.js)), filled in during M1. Requires `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — copy `.env.example` to `.env.local` and set `VITE_DATA_BACKEND=supabase` plus those two vars.

## Deploy

Pushing to `main` builds and deploys to GitHub Pages via `.github/workflows/deploy.yml`. One-time setup needed in the GitHub repo settings:
- **Settings → Pages → Source:** GitHub Actions
- **Settings → Secrets and variables → Actions:** add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (only needed once M1 switches the deployed build to the `supabase` backend)

## Roadmap

### M0 — Project scaffolding
- [x] Init frontend: React + Vite
- [x] Data layer abstraction (`src/lib/data/`) with a Supabase-free local backend, so M2-M6 can be built before M1 lands
- [ ] Supabase project (free tier), local `supabase` CLI + migrations folder (folder created, empty)
- [x] GitHub Pages deploy pipeline (GitHub Actions build+deploy on push to main — needs one-time repo settings, see Deploy above)
- [x] Env/config for Supabase URL+anon key in a static-safe way

### M1 — Schema & auth
- [ ] Migrations for `users`, `children`, `recipes`, `batches`, `serving_events`, `app_settings`
- [ ] RLS policies: all 3 users equal read/write on core tables; `app_settings` write gated to `role = admin`; hard delete gated to admin
- [ ] Postgres function for atomic portion decrement/restore (serve + undo)
- [ ] Supabase Auth: 3 manually-created accounts, email/password or magic link, no signup UI
- [ ] Seed script: 3 users (2 parent personas, 1 helper), 1 child (Hazel)
- [ ] Implement `src/lib/data/supabaseBackend.js` against the schema above (same function signatures as `localBackend.js`)

### M2 — Recipes
- [x] Recipe list + detail view
- [x] Add/edit recipe form: title, ingredients (name/qty/unit, repeatable rows), instructions, notes

### M3 — Batch logging (helper)
- [x] Recipe picker → portions-made input → camera capture → client-side resize/compress (≤1000px, JPEG/WebP ~70-80%) → preview/retake → save (`batches/new`, `batches/:id`)
- [x] Photo fetch abstracted behind `getPhotoUrl()` (object URL locally; will be a signed URL once M1's `supabaseBackend.js` lands — never store/display raw public URLs)

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

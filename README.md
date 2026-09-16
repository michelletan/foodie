# foodie

Shared toddler meal-prep tracker for two parents and a helper. Full spec: see `Meal plan app.md` in the "baby meal prep" project notes.

**Stack:** React + Vite (PWA), Supabase (Postgres + Auth + Storage + Realtime + Edge Functions), Telegram bot for notifications. Will deploy to GitHub Pages once the app is ready (see Deploy below).

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

### Data migrations

One-off imports live in `src/lib/data/` next to the backends they populate through, e.g. [`importPdfRecipes.js`](src/lib/data/importPdfRecipes.js) (the 4 recipes from "helper cooking"). They call the same `createRecipe()`/etc. functions feature code uses, so they work against whichever backend `VITE_DATA_BACKEND` currently points at — no changes needed once M1 switches this from `local` to `supabase`. Idempotent (skip anything that already exists by title), so safe to re-run.

Run one from the browser devtools console while `npm run dev` is running — each is attached to `window` in dev builds only:

```js
await importPdfRecipes()
```

## Deploy

Not set up yet — deliberately deferred until the app is further along. When it's time, re-add a GitHub Actions workflow that builds and deploys to GitHub Pages on push to `main`, with `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` as repo secrets and Pages source set to "GitHub Actions".

## Roadmap

### M0 — Project scaffolding
- [x] Init frontend: React + Vite
- [x] Data layer abstraction (`src/lib/data/`) with a Supabase-free local backend, so M2-M6 can be built before M1 lands
- [ ] Supabase project (free tier), local `supabase` CLI + migrations folder (folder created, empty)
- [ ] GitHub Pages deploy pipeline (deliberately deferred until the app is ready — see Deploy below)
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
- [x] Recipe `format`: `structured` (fields above) or `freetext` (paste the whole recipe as one block, stored/shown verbatim) — chosen per recipe via a toggle in the form

### M3 — Batch logging (helper)
- [x] Recipe picker → portions-made input → camera capture → client-side resize/compress (≤1000px, JPEG/WebP ~70-80%) → preview/retake → save (`batches/new`, `batches/:id`)
- [x] Photo fetch abstracted behind `getPhotoUrl()` (object URL locally; will be a signed URL once M1's `supabaseBackend.js` lands — never store/display raw public URLs)

### M4 — Serving flow (helper)
- [x] Batch picker → portion stepper → 1-5 rating tap targets → optional note → save (`/serve`, also reachable via "Serve" on a batch's detail page)
- [x] One-handed UI constraint: large tap targets (64px stepper/rating buttons), no required free text
- [x] Wires into `serveMeal()`'s atomic decrement (local backend now; same call will hit M1's Postgres function once `supabaseBackend.js` is implemented)

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

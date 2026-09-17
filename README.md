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

### Data migrations

One-off imports live in `src/lib/data/` next to the backends they populate through, e.g. [`importPdfRecipes.js`](src/lib/data/importPdfRecipes.js) (the 4 recipes from "helper cooking"). They call the same `createRecipe()`/etc. functions feature code uses, so they work against whichever backend `VITE_DATA_BACKEND` currently points at — no changes needed once M1 switches this from `local` to `supabase`. Idempotent (skip anything that already exists by title), so safe to re-run.

Run one from the browser devtools console while `npm run dev` is running — each is attached to `window` in dev builds only:

```js
await importPdfRecipes()
```

## Supabase setup (M1)

The migrations and the real backend ([`supabaseBackend.js`](src/lib/data/supabaseBackend.js)) are written — this is what's left to actually turn it on, all done in the [Supabase dashboard](https://supabase.com/dashboard):

1. **Create the project** (New project). Save the database password somewhere safe (a password manager) — Supabase won't show it again.
2. **Run the migrations**, in order, via SQL Editor → paste each file's contents → Run: [`0001_schema.sql`](supabase/migrations/0001_schema.sql), [`0002_rls.sql`](supabase/migrations/0002_rls.sql), [`0003_functions.sql`](supabase/migrations/0003_functions.sql), [`0004_storage.sql`](supabase/migrations/0004_storage.sql), [`0005_seed.sql`](supabase/migrations/0005_seed.sql), [`0006_username_login.sql`](supabase/migrations/0006_username_login.sql). (Or via the Supabase CLI — `supabase link` then `supabase db push` — if you'd rather.)
3. **Create the 3 accounts**: Authentication → Users → Add user, one each for the 2 parents + helper (email/password is simplest — the email never appears in the app UI, see step 6). Copy each one's UUID.
4. **Link those accounts to app roles** — SQL Editor, using the 3 real UUIDs from step 3:
   ```sql
   insert into public.users (id, name, role) values
     ('<uuid>', 'Parent 1', 'admin'),
     ('<uuid>', 'Parent 2', 'user'),
     ('<uuid>', 'Helper', 'user');
   ```
5. **Get the API URL + anon key**: Project Settings → API. Put them in `.env.local` (copy from `.env.example`) along with `VITE_DATA_BACKEND=supabase`.
6. **Set a username per account** — SQL Editor, using the same 3 UUIDs:
   ```sql
   update public.users set username = 'parent1' where id = '<uuid>';
   update public.users set username = 'parent2' where id = '<uuid>';
   update public.users set username = 'helper' where id = '<uuid>';
   ```

`src/routes/Login.jsx` handles sign-in (username/password) — the username is resolved to the account's real email server-side via the `email_for_username` RPC from step 2's migration, so the email itself is only ever entered once, in the dashboard. There's no signup form, since accounts are only ever created manually as above.

## Testing

```bash
npm test
```

Unit tests cover [`src/lib/data/localBackend.js`](src/lib/data/localBackend.js) (Vitest + jsdom + `fake-indexeddb`) — seeding, the atomic serve/void portion math, admin-only gating on hard deletes, void-excludes-but-keeps behavior, and recipe format handling — plus [`importPdfRecipes.js`](src/lib/data/importPdfRecipes.js)'s idempotency. UI/component tests aren't set up yet; everything above M0's data layer has so far only been verified by hand in the browser.

Node 22+'s experimental built-in `localStorage` shadows jsdom's working one with a broken stub, so the `test` script disables it via `NODE_OPTIONS=--no-experimental-webstorage`.

## Deploy

Pushing to `main` builds and deploys to GitHub Pages via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). One-time setup needed in the GitHub repo settings before the first deploy will actually work:
- **Settings → Pages → Source:** GitHub Actions
- **Settings → Secrets and variables → Actions → Secrets:** add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- **Settings → Secrets and variables → Actions → Variables:** add `VITE_DATA_BACKEND` set to `supabase` once your Supabase project is confirmed working — until then, leave it unset and the deployed build defaults to the `local` backend (each visitor gets their own private browser-only data, not shared across the 3 of you)

## Roadmap

### M0 — Project scaffolding
- [x] Init frontend: React + Vite
- [x] Data layer abstraction (`src/lib/data/`) with a Supabase-free local backend, so M2-M6 can be built before M1 lands
- [ ] Supabase project (free tier) — account created; project itself not yet (see "Supabase setup" below)
- [x] GitHub Pages deploy pipeline (GitHub Actions build+deploy on push to main — needs one-time repo settings, see Deploy below)
- [x] Env/config for Supabase URL+anon key in a static-safe way

### M1 — Schema & auth
- [x] Migrations for `users`, `children`, `recipes`, `batches`, `serving_events`, `app_settings` — written in `supabase/migrations/`, not yet applied to a live project (see "Supabase setup" above)
- [x] RLS policies: all 3 users equal read/write on core tables; admin-only mutations (hard delete, settings) have no direct UPDATE policy at all and go through SECURITY DEFINER functions instead, since RLS can't cleanly gate individual columns
- [x] Postgres functions for atomic portion decrement/restore (`serve_meal`, `void_serving_event`) plus every other admin-gated mutation
- [ ] Supabase Auth: 3 manually-created accounts — your action in the dashboard, see "Supabase setup" above
- [x] Seed script: `0005_seed.sql` seeds the 1 child (Hazel); the 3 `public.users` rows need real auth UUIDs from the step above, so that insert is documented but can't be pre-written
- [x] Implement `src/lib/data/supabaseBackend.js` against the schema above (same function signatures as `localBackend.js`) — untested against a live project so far
- [x] Login screen ([`Login.jsx`](src/routes/Login.jsx), gated by [`AuthGate.jsx`](src/components/AuthGate.jsx)) — email/password only, no signup form (accounts are created manually, see "Supabase setup" above). `AuthGate` checks for `getSession` to decide whether an auth wall applies at all, so the local dev backend is completely unaffected (verified: no login wall, same as before)

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
- [x] Void (soft delete) on any batch/serving_event, no time limit, any user, restores portion counts (batch/serving buttons on `/batches/:id`)
- [x] Hard delete, admin-only, separate confirmation — gated both in the UI (button hidden for non-admins) and in the data layer (`requireAdmin` throws regardless of what the UI shows)

### M6 — Parent dashboard
- [x] Freezer view (`/freezer`): portions remaining grouped child → recipe → batch, photo + prep date
- [x] History view (`/history`): chronological serving feed — `listServingEvents()` defaults to `includeVoided: false`, so voided entries are excluded from the feed but stay visible (marked "voided") on the batch's own Servings list, never deleted
- [ ] Supabase Realtime subscriptions so both views update live — can't be wired until M1 gives us a real backend to subscribe to; both views fetch once on mount with a `refresh()` function ready for a subscription to call
- [x] Child-selector skipped when only 1 child exists (freezer view omits the child heading entirely, matching §3.5)

### M7 — Telegram notifications
- [ ] Bot creation + chat-id linking flow, store on `users.telegram_chat_id`
- [ ] Supabase Edge Function(s) triggered on `batches`/`serving_events` insert and on `portions_remaining` crossing `app_settings.low_stock_threshold`
- [ ] Admin-only settings screen to edit the threshold

### M8 — Ops
- [ ] Keepalive ping (GitHub Actions cron or UptimeRobot) so the Supabase free project doesn't pause after 7 days idle
- [x] PWA manifest/icons for home-screen install on all 3 phones — [`vite-plugin-pwa`](vite.config.js) generates the manifest + service worker (precaches the app shell for offline use; `HashRouter` means there's no server-side route to fall back on, so nothing else needs runtime caching); icons regenerate from `public/favicon.svg` via `npm run icons` ([`scripts/generate-icons.mjs`](scripts/generate-icons.mjs)) — re-run that whenever the logo changes
- [x] Username login instead of email — `Login.jsx` takes a username, resolved to the real account email via a Supabase RPC before `signInWithPassword` (see "Supabase setup" step 6 above); session persists in `localStorage` (supabase-js default, made explicit in [`supabaseClient.js`](src/lib/supabaseClient.js)) so an installed PWA stays logged in across launches

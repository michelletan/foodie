-- Freezer meals are grouped by expiry date in FreezerView.jsx; batches made
-- before this migration have no expiry, so it's nullable rather than
-- backfilled with a guess.
alter table public.batches add column expires_at timestamptz;

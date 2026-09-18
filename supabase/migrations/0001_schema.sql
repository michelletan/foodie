-- Core schema for the toddler meal-prep tracker. See README's Data layer
-- section and src/lib/data/localBackend.js for the interface this mirrors.

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  role text not null check (role in ('admin', 'user')),
  telegram_chat_id text
);

create table public.children (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  format text not null default 'structured' check (format in ('structured', 'freetext')),
  ingredients jsonb not null default '[]'::jsonb,
  instructions text not null,
  notes text,
  -- Tags the recipe's meal category so the recipe list can show an icon for
  -- quick visual scanning, and so the low-stock alert can exclude sides
  -- (soup, carbs) from the total-portions count (see
  -- src/lib/mealCategories.js for the values and the countsTowardStock flag
  -- this must match).
  category text check (
    category in ('beef', 'chicken', 'pork', 'fish', 'egg', 'vegetarian', 'soup', 'carbs', 'other')
  ),
  created_by uuid not null references public.users (id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.batches (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id),
  child_id uuid not null references public.children (id),
  prepared_by uuid not null references public.users (id) default auth.uid(),
  portions_total integer not null check (portions_total > 0),
  portions_remaining integer not null check (portions_remaining >= 0),
  portion_size text,
  -- Freezer meals are grouped by expiry date in FreezerView.jsx; nullable
  -- since not every batch has a known expiry.
  expires_at timestamptz,
  photo_path text,
  prepared_at timestamptz not null default now(),
  voided_at timestamptz,
  deleted_at timestamptz
);

-- batch_id is nullable: a serving can come from a tracked freezer batch, or
-- just be logged as free text / a photo / nothing (milk). The check below
-- requires a batch, description, or photo unless meal_type is 'milk' — see
-- ServeForm.jsx, which mirrors this rule client-side. satisfaction_rating is
-- optional — ServeForm.jsx doesn't require tapping one.
create table public.serving_events (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.batches (id),
  served_by uuid not null references public.users (id),
  portions_used integer check (portions_used > 0),
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack', 'milk')),
  description text,
  photo_path text,
  satisfaction_rating smallint check (satisfaction_rating between 1 and 5),
  notes text,
  served_at timestamptz not null default now(),
  voided_at timestamptz,
  deleted_at timestamptz,
  check (meal_type = 'milk' or batch_id is not null or description is not null or photo_path is not null)
);

-- Single-row table (id is always `true`) for admin-editable app settings.
create table public.app_settings (
  id boolean primary key default true check (id),
  low_stock_threshold integer not null default 3
);
insert into public.app_settings (id, low_stock_threshold) values (true, 3);

create index batches_recipe_id_idx on public.batches (recipe_id);
create index batches_child_id_idx on public.batches (child_id);
create index serving_events_batch_id_idx on public.serving_events (batch_id);

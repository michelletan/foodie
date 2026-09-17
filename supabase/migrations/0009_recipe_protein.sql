-- Lets a recipe be tagged with its main protein, so the recipe list can show
-- an icon for quick visual scanning (see src/lib/proteins.js for the values
-- this must match).
alter table public.recipes add column protein text
  check (protein in ('beef', 'chicken', 'pork', 'fish', 'egg', 'vegetarian', 'other'));

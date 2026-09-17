-- Seeds the one child. The 3 `public.users` rows can't be seeded here —
-- they need real auth.users UUIDs, which only exist once you've created
-- the 3 accounts in Authentication → Users (see README's Supabase setup
-- steps). After that, insert one row per account, e.g.:
--
-- insert into public.users (id, name, role) values
--   ('<uuid>', 'Parent 1', 'admin'),
--   ('<uuid>', 'Parent 2', 'user'),
--   ('<uuid>', 'Helper', 'user');

insert into public.children (name) values ('Hazel');

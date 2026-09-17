-- Lets Login.jsx take a username instead of an email. Supabase Auth itself
-- is still email/password under the hood (no native username sign-in), so
-- this adds a username -> email lookup the client can call before
-- signInWithPassword. See src/lib/data/supabaseBackend.js's signIn().
--
-- Trade-off: email_for_username is callable by anon (it has to be, since
-- there's no session yet at login time), so anyone who knows or guesses a
-- username can read the associated email through it. Acceptable here since
-- this is a private app for 3 known users, not a public product.

alter table public.users add column username text unique;

create or replace function public.email_for_username(p_username text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select au.email
  from public.users u
  join auth.users au on au.id = u.id
  where u.username = lower(p_username)
  limit 1
$$;

grant execute on function public.email_for_username(text) to anon;

-- One-off: set a username per existing account (SQL Editor), e.g.:
--   update public.users set username = 'parent1' where id = '<uuid>';

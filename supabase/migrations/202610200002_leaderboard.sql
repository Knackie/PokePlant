begin;

create table public.leaderboard_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 2 and 30),
  updated_at timestamptz not null default now()
);
alter table public.leaderboard_profiles enable row level security;
revoke all on public.leaderboard_profiles from anon, authenticated;
grant select, insert, update, delete on public.leaderboard_profiles to authenticated;
create policy "read own leaderboard profile" on public.leaderboard_profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy "insert own leaderboard profile" on public.leaderboard_profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "update own leaderboard profile" on public.leaderboard_profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own leaderboard profile" on public.leaderboard_profiles for delete to authenticated using ((select auth.uid()) = user_id);

create function public.get_leaderboard()
returns table (rank bigint, display_name text, species bigint, xp bigint, level bigint, is_me boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with scores as (
    select p.user_id, p.display_name, count(c.id) as species
    from public.leaderboard_profiles p
    left join public.captures c on c.user_id = p.user_id
    group by p.user_id, p.display_name
  )
  select row_number() over (order by s.species desc, s.display_name asc, s.user_id asc) as rank,
         s.display_name,
         s.species,
         s.species * 100 as xp,
         (s.species * 100) / 300 + 1 as level,
         s.user_id = (select auth.uid()) as is_me
  from scores s
  order by rank
  limit 10;
$$;
revoke all on function public.get_leaderboard() from public, anon, authenticated;
grant execute on function public.get_leaderboard() to authenticated;

commit;

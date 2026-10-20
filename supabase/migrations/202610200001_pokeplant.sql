begin;

create table public.captures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scientific_name text not null check (length(trim(scientific_name)) between 1 and 200),
  common_name text not null check (length(common_name) <= 200),
  family text not null check (length(family) <= 200),
  score double precision not null check (score between 0 and 1),
  photo_path text not null unique,
  species_key text generated always as (lower(trim(scientific_name))) stored,
  created_at timestamptz not null default now(),
  unique (user_id, species_key),
  check (photo_path ~ ('^' || user_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'))
);
alter table public.captures enable row level security;
revoke all on public.captures from anon, authenticated;
grant select, insert, delete on public.captures to authenticated;
create policy "read own captures" on public.captures for select to authenticated using ((select auth.uid()) = user_id);
create policy "insert own captures" on public.captures for insert to authenticated with check (
  (select auth.uid()) = user_id
  and created_at between now() - interval '5 minutes' and now() + interval '1 minute'
  and exists (select 1 from storage.objects where bucket_id = 'plant-photos' and name = photo_path)
);
create policy "delete own captures" on public.captures for delete to authenticated using ((select auth.uid()) = user_id);
create index captures_owner_date on public.captures(user_id, created_at desc);

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('plant-photos', 'plant-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']);
create policy "read own plant photos" on storage.objects for select to authenticated using (
  bucket_id = 'plant-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy "insert own plant photos" on storage.objects for insert to authenticated with check (
  bucket_id = 'plant-photos' and name ~ ('^' || (select auth.uid())::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$')
);
create policy "delete own plant photos" on storage.objects for delete to authenticated using (
  bucket_id = 'plant-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
);

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table private.scan_usage (
  day date not null,
  scope text not null,
  used integer not null default 0 check (used >= 0),
  primary key(day, scope)
);
revoke all on private.scan_usage from public, anon, authenticated;

create function public.reserve_plant_scan(p_user_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  today date := (clock_timestamp() at time zone 'UTC')::date;
  global_used integer;
  user_used integer;
begin
  if p_user_id is null then raise exception 'user required'; end if;
  -- A single lock serializes reservations across both counters.
  perform pg_advisory_xact_lock(716243091);
  insert into private.scan_usage(day, scope) values (today, 'global'), (today, p_user_id::text) on conflict do nothing;
  select used into global_used from private.scan_usage where day = today and scope = 'global';
  select used into user_used from private.scan_usage where day = today and scope = p_user_id::text;
  if global_used >= 450 then return 'global_limit'; end if;
  if user_used >= 20 then return 'user_limit'; end if;
  update private.scan_usage set used = used + 1 where day = today and scope in ('global', p_user_id::text);
  delete from private.scan_usage where day < today - 7;
  return 'ok';
end;
$$;
revoke all on function public.reserve_plant_scan(uuid) from public, anon, authenticated;
grant execute on function public.reserve_plant_scan(uuid) to service_role;

commit;

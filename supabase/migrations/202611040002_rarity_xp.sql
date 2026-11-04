begin;

alter table public.captures
  add column rarity text not null default 'common'
  check (rarity in ('common', 'uncommon', 'rare', 'epic', 'unclassified'));

drop policy "insert own captures" on public.captures;
create policy "insert own captures" on public.captures for insert to authenticated with check (
  (select auth.uid()) = user_id
  and created_at between now() - interval '5 minutes' and now() + interval '1 minute'
  and exists (select 1 from storage.objects where bucket_id = 'plant-photos' and name = photo_path)
  and rarity = coalesce((
    select p.rarity from public.plant_rarities p
    where p.species_key = lower(trim(scientific_name))
  ), 'unclassified')
);

create or replace function public.replace_plant_capture(
  p_capture_id uuid,
  p_scientific_name text,
  p_common_name text,
  p_family text,
  p_score double precision,
  p_photo_path text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  old_photo_path text;
  old_rarity text;
begin
  if current_user_id is null then raise exception 'Connexion requise.'; end if;
  if length(trim(coalesce(p_scientific_name, ''))) not between 1 and 200 then raise exception 'Nom scientifique invalide.'; end if;
  if length(coalesce(p_common_name, '')) > 200 or length(coalesce(p_family, '')) > 200 then raise exception 'Informations de plante trop longues.'; end if;
  if p_score is null or p_score not between 0 and 1 then raise exception 'Score d’identification invalide.'; end if;
  if p_photo_path !~ ('^' || current_user_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$') then
    raise exception 'Chemin de photo invalide.';
  end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'plant-photos' and o.name = p_photo_path
  ) then raise exception 'La nouvelle photo n’a pas été téléversée.'; end if;

  select c.photo_path, c.rarity into old_photo_path, old_rarity
  from public.captures c
  where c.id = p_capture_id
    and c.user_id = current_user_id
    and c.species_key = lower(trim(p_scientific_name))
  for update;
  if old_photo_path is null then raise exception 'Cette plante n’est plus dans ton Plantédex. Recharge ta collection.'; end if;

  delete from public.captures where id = p_capture_id and user_id = current_user_id;
  insert into public.captures(user_id, scientific_name, common_name, family, score, photo_path, rarity)
  values (current_user_id, trim(p_scientific_name), p_common_name, p_family, p_score, p_photo_path, old_rarity);
  return old_photo_path;
end;
$$;
revoke all on function public.replace_plant_capture(uuid, text, text, text, double precision, text) from public, anon;
grant execute on function public.replace_plant_capture(uuid, text, text, text, double precision, text) to authenticated;

create or replace function public.get_leaderboard()
returns table (rank bigint, display_name text, species bigint, xp bigint, level bigint, is_me boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with scores as (
    select p.user_id,
           p.display_name,
           count(c.id) as species,
           coalesce(sum(case
             when c.id is null then 0
             when c.rarity = 'uncommon' then 150
             when c.rarity = 'rare' then 250
             when c.rarity = 'epic' then 500
             else 100
           end), 0)::bigint as xp
    from public.leaderboard_profiles p
    left join public.captures c on c.user_id = p.user_id
    group by p.user_id, p.display_name
  )
  select row_number() over (order by s.xp desc, s.species desc, s.display_name asc, s.user_id asc) as rank,
         s.display_name,
         s.species,
         s.xp,
         s.xp / 300 + 1 as level,
         s.user_id = (select auth.uid()) as is_me
  from scores s
  order by rank
  limit 10;
$$;
revoke all on function public.get_leaderboard() from public, anon, authenticated;
grant execute on function public.get_leaderboard() to authenticated;

create or replace function public.get_friend_connections()
returns table (
  request_id uuid,
  friend_id uuid,
  display_name text,
  friend_code text,
  status text,
  incoming boolean,
  species bigint,
  xp bigint,
  level bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id,
         p.user_id,
         p.display_name,
         p.friend_code,
         case when r.accepted_at is null then 'pending' else 'accepted' end,
         r.receiver_id = (select auth.uid()),
         count(c.id)::bigint,
         coalesce(sum(case
           when c.id is null then 0
           when c.rarity = 'uncommon' then 150
           when c.rarity = 'rare' then 250
           when c.rarity = 'epic' then 500
           else 100
         end), 0)::bigint,
         coalesce(sum(case
           when c.id is null then 0
           when c.rarity = 'uncommon' then 150
           when c.rarity = 'rare' then 250
           when c.rarity = 'epic' then 500
           else 100
         end), 0)::bigint / 300 + 1
  from public.friend_requests r
  join public.friend_profiles p
    on p.user_id = case when r.sender_id = (select auth.uid()) then r.receiver_id else r.sender_id end
  left join public.captures c
    on r.accepted_at is not null and c.user_id = p.user_id
  where (select auth.uid()) in (r.sender_id, r.receiver_id)
  group by r.id, p.user_id, p.display_name, p.friend_code, r.accepted_at, r.sender_id, r.receiver_id
  order by r.accepted_at nulls first, p.display_name;
$$;

commit;

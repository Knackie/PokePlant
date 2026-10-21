begin;

create table public.friend_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 2 and 30),
  friend_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  updated_at timestamptz not null default now()
);
alter table public.friend_profiles enable row level security;
revoke all on public.friend_profiles from anon, authenticated;
grant select, insert, update on public.friend_profiles to authenticated;

create table public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  check (sender_id <> receiver_id)
);
create unique index friend_requests_unique_pair on public.friend_requests
  (least(sender_id, receiver_id), greatest(sender_id, receiver_id));
create index friend_requests_sender on public.friend_requests(sender_id);
create index friend_requests_receiver on public.friend_requests(receiver_id);
alter table public.friend_requests enable row level security;
revoke all on public.friend_requests from anon, authenticated;
grant select on public.friend_requests to authenticated;
create policy "read own friend requests" on public.friend_requests for select to authenticated
  using ((select auth.uid()) in (sender_id, receiver_id));
create policy "read own and connected friend profiles" on public.friend_profiles for select to authenticated using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.friend_requests r
    where (r.sender_id = (select auth.uid()) and r.receiver_id = friend_profiles.user_id)
       or (r.receiver_id = (select auth.uid()) and r.sender_id = friend_profiles.user_id)
  )
);
create policy "insert own friend profile" on public.friend_profiles for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "update own friend profile" on public.friend_profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create function public.search_friend_players(p_display_name text)
returns table (display_name text, friend_code text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'Connexion requise.'; end if;
  if length(trim(coalesce(p_display_name, ''))) < 2 then raise exception 'Saisis au moins deux caractères.'; end if;
  return query
    select p.display_name, p.friend_code
    from public.friend_profiles p
    where p.user_id <> (select auth.uid())
      and (
        lower(trim(p.display_name)) = lower(trim(p_display_name))
        or p.friend_code = upper(trim(p_display_name))
      )
    order by p.friend_code
    limit 20;
end;
$$;

create function public.send_friend_request(p_friend_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_user_id uuid;
  request_id uuid;
begin
  if current_user_id is null then raise exception 'Connexion requise.'; end if;
  select p.user_id into target_user_id
  from public.friend_profiles p
  where p.friend_code = upper(trim(coalesce(p_friend_code, '')));
  if target_user_id is null then raise exception 'Ce pseudo ou code ami est introuvable.'; end if;
  if target_user_id = current_user_id then raise exception 'Tu ne peux pas t’ajouter toi-même.'; end if;
  insert into public.friend_requests(sender_id, receiver_id)
  values (current_user_id, target_user_id)
  returning id into request_id;
  return request_id;
exception
  when unique_violation then raise exception 'Une demande ou une amitié existe déjà entre ces joueurs.';
end;
$$;

create function public.respond_friend_request(p_request_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_rows integer;
begin
  if (select auth.uid()) is null then raise exception 'Connexion requise.'; end if;
  if p_accept then
    update public.friend_requests
    set accepted_at = now()
    where id = p_request_id and receiver_id = (select auth.uid()) and accepted_at is null;
  else
    delete from public.friend_requests
    where id = p_request_id and receiver_id = (select auth.uid()) and accepted_at is null;
  end if;
  get diagnostics changed_rows = row_count;
  if changed_rows = 0 then raise exception 'Cette demande n’est plus disponible.'; end if;
end;
$$;

create function public.remove_friend(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_rows integer;
begin
  if (select auth.uid()) is null then raise exception 'Connexion requise.'; end if;
  delete from public.friend_requests
  where id = p_request_id and (sender_id = (select auth.uid()) or receiver_id = (select auth.uid()));
  get diagnostics changed_rows = row_count;
  if changed_rows = 0 then raise exception 'Cette relation n’existe plus.'; end if;
end;
$$;

create function public.get_friend_connections()
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
         count(c.id)::bigint * 100,
         (count(c.id)::bigint * 100) / 300 + 1
  from public.friend_requests r
  join public.friend_profiles p
    on p.user_id = case when r.sender_id = (select auth.uid()) then r.receiver_id else r.sender_id end
  left join public.captures c
    on r.accepted_at is not null and c.user_id = p.user_id
  where (select auth.uid()) in (r.sender_id, r.receiver_id)
  group by r.id, p.user_id, p.display_name, p.friend_code, r.accepted_at, r.sender_id, r.receiver_id
  order by r.accepted_at nulls first, p.display_name;
$$;

create function public.are_friends(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.friend_requests r
    where r.accepted_at is not null
      and ((r.sender_id = (select auth.uid()) and r.receiver_id = p_user_id)
        or (r.receiver_id = (select auth.uid()) and r.sender_id = p_user_id))
  );
$$;

revoke all on function public.search_friend_players(text) from public, anon;
revoke all on function public.send_friend_request(text) from public, anon;
revoke all on function public.respond_friend_request(uuid, boolean) from public, anon;
revoke all on function public.remove_friend(uuid) from public, anon;
revoke all on function public.get_friend_connections() from public, anon;
revoke all on function public.are_friends(uuid) from public, anon;
grant execute on function public.search_friend_players(text) to authenticated;
grant execute on function public.send_friend_request(text) to authenticated;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.get_friend_connections() to authenticated;
grant execute on function public.are_friends(uuid) to authenticated;

create policy "read accepted friends captures" on public.captures for select to authenticated
  using (public.are_friends(user_id));
create policy "read accepted friends plant photos" on storage.objects for select to authenticated using (
  bucket_id = 'plant-photos'
  and case
    when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.are_friends(((storage.foldername(name))[1])::uuid)
    else false
  end
);

commit;

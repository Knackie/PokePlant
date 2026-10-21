begin;

create function public.replace_plant_capture(
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

  select c.photo_path into old_photo_path
  from public.captures c
  where c.id = p_capture_id
    and c.user_id = current_user_id
    and c.species_key = lower(trim(p_scientific_name))
  for update;
  if old_photo_path is null then raise exception 'Cette plante n’est plus dans ton Plantédex. Recharge ta collection.'; end if;

  delete from public.captures where id = p_capture_id and user_id = current_user_id;
  insert into public.captures(user_id, scientific_name, common_name, family, score, photo_path)
  values (current_user_id, trim(p_scientific_name), p_common_name, p_family, p_score, p_photo_path);
  return old_photo_path;
end;
$$;

revoke all on function public.replace_plant_capture(uuid, text, text, text, double precision, text) from public, anon;
grant execute on function public.replace_plant_capture(uuid, text, text, text, double precision, text) to authenticated;

commit;

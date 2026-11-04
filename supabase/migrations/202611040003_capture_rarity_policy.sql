begin;

drop policy "insert own captures" on public.captures;
create policy "insert own captures" on public.captures for insert to authenticated with check (
  (select auth.uid()) = user_id
  and created_at between now() - interval '5 minutes' and now() + interval '1 minute'
  and exists (select 1 from storage.objects where bucket_id = 'plant-photos' and name = photo_path)
  and rarity = coalesce((
    select p.rarity from public.plant_rarities p
    where p.species_key = lower(trim(captures.scientific_name))
  ), 'unclassified')
);

commit;

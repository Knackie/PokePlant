create table if not exists public.plant_rarities (
  species_key text primary key,
  scientific_name text not null,
  gbif_occurrences bigint not null check (gbif_occurrences >= 0),
  rarity text not null check (rarity in ('common', 'uncommon', 'rare', 'epic', 'unclassified')),
  checked_at timestamptz not null,
  constraint plant_rarities_species_key_matches_name
    check (species_key = lower(trim(scientific_name)))
);

alter table public.plant_rarities enable row level security;
revoke all on public.plant_rarities from anon, authenticated;
grant select on public.plant_rarities to authenticated;
grant all on public.plant_rarities to service_role;

drop policy if exists "Authenticated users can read plant rarities" on public.plant_rarities;
create policy "Authenticated users can read plant rarities"
  on public.plant_rarities for select to authenticated using (true);

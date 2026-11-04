import type { PlantRarityRecord } from '../types';
import { speciesKey } from '../game';
import { functionError, requireSupabase } from './supabase';

export const rarityLabels: Record<PlantRarityRecord['rarity'], string> = {
  common: 'Commune',
  uncommon: 'Insolite',
  rare: 'Rare',
  epic: 'Épique',
  unclassified: 'À classer',
};

export const rarityOrder: Record<PlantRarityRecord['rarity'], number> = {
  epic: 0,
  rare: 1,
  uncommon: 2,
  common: 3,
  unclassified: 4,
};

export async function loadPlantRarities(scientificNames: string[]): Promise<PlantRarityRecord[]> {
  const keys = [...new Set(scientificNames.map(speciesKey).filter(Boolean))];
  if (!keys.length) return [];
  const client = requireSupabase();
  const rows: PlantRarityRecord[] = [];
  for (let index = 0; index < keys.length; index += 100) {
    const { data, error } = await client
      .from('plant_rarities')
      .select('species_key,scientific_name,gbif_occurrences,rarity,checked_at')
      .in('species_key', keys.slice(index, index + 100));
    if (error) throw error;
    rows.push(...data);
  }
  return rows;
}

export async function refreshPlantRarities(scientificNames: string[]): Promise<PlantRarityRecord[]> {
  const uniqueNames = new Map<string, string>();
  for (const name of scientificNames) {
    const trimmed = name.trim();
    const key = speciesKey(trimmed);
    if (key && !uniqueNames.has(key)) uniqueNames.set(key, trimmed);
  }
  const names = [...uniqueNames.values()];
  if (!names.length) return [];
  const results: PlantRarityRecord[] = [];
  for (let index = 0; index < names.length; index += 50) {
    const batch = names.slice(index, index + 50);
    const { data, error } = await requireSupabase().functions.invoke('plant-rarity', {
      body: { scientificNames: batch },
    });
    if (error) throw new Error(await functionError(error));
    if (!data || !Array.isArray(data.results) || data.results.length !== batch.length || !data.results.every(isPlantRarityRecord)) {
      throw new Error('Le service de rareté a renvoyé une réponse invalide.');
    }
    const expectedKeys = new Set(batch.map(speciesKey));
    if (new Set(data.results.map((row: PlantRarityRecord) => row.species_key)).size !== batch.length
      || data.results.some((row: PlantRarityRecord) => !expectedKeys.has(row.species_key))) {
      throw new Error('Le service de rareté n’a pas classé toutes les plantes demandées.');
    }
    results.push(...data.results);
  }
  return results;
}

function isPlantRarityRecord(value: unknown): value is PlantRarityRecord {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return typeof row.species_key === 'string'
    && typeof row.scientific_name === 'string'
    && typeof row.gbif_occurrences === 'number'
    && Number.isSafeInteger(row.gbif_occurrences)
    && ['common', 'uncommon', 'rare', 'epic', 'unclassified'].includes(String(row.rarity))
    && typeof row.checked_at === 'string'
    && Number.isFinite(Date.parse(row.checked_at));
}

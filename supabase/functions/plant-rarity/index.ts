import { authenticate, endpoint, HttpError, readBounded } from '../_shared/http.ts';
import { classifyPlantRarity } from '../_shared/plant-rarity.ts';

const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_NAMES = 50;
const GBIF_ENDPOINT = 'https://api.gbif.org/v1/occurrence/search';
const FIELDS = 'species_key,scientific_name,gbif_occurrences,rarity,checked_at';

type RarityRow = {
  species_key: string;
  scientific_name: string;
  gbif_occurrences: number;
  rarity: ReturnType<typeof classifyPlantRarity>;
  checked_at: string;
};

function validScientificName(value: unknown): value is string {
  return typeof value === 'string'
    && value.trim().length > 0
    && value.trim().length <= 200
    && !/[\u0000-\u001f\u007f]/.test(value);
}

async function occurrenceCount(scientificName: string): Promise<number> {
  const url = new URL(GBIF_ENDPOINT);
  url.searchParams.set('scientificName', scientificName);
  url.searchParams.set('continent', 'EUROPE');
  url.searchParams.set('limit', '0');
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000), headers: { Accept: 'application/json' } });
  if (!response.ok) throw new HttpError(503, 'GBIF ne répond pas pour le moment. Réessaie plus tard.');
  const data: unknown = await response.json();
  if (!data || typeof data !== 'object' || !('count' in data) || typeof data.count !== 'number' || !Number.isSafeInteger(data.count) || data.count < 0) {
    throw new HttpError(502, 'GBIF a renvoyé un résultat inexploitable. Réessaie plus tard.');
  }
  return data.count;
}

async function mapConcurrent<T, R>(values: T[], concurrency: number, callback: (value: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(values.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (next < values.length) {
      const index = next++;
      results[index] = await callback(values[index]);
    }
  }));
  return results;
}

Deno.serve(endpoint(async (request, headers) => {
  const { admin } = await authenticate(request);
  const bytes = await readBounded(request, 12_000);
  let body: unknown;
  try { body = JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new HttpError(400, 'Le contenu de la requête est invalide.'); }
  if (!body || typeof body !== 'object' || !('scientificNames' in body) || !Array.isArray(body.scientificNames)) {
    throw new HttpError(400, 'La liste des noms botaniques est invalide.');
  }
  const names = body.scientificNames;
  if (!names.length || names.length > MAX_NAMES || !names.every(validScientificName)) {
    throw new HttpError(400, `Envoie de 1 à ${MAX_NAMES} noms botaniques valides.`);
  }

  const uniqueNames = [...new Map((names as string[]).map((name) => [name.trim().toLowerCase(), name.trim()])).entries()];
  const keys = uniqueNames.map(([key]) => key);
  const { data: cachedRows, error: cacheError } = await admin.from('plant_rarities').select(FIELDS).in('species_key', keys);
  if (cacheError) throw new Error('Impossible de lire le cache de rareté.');
  const cachedByKey = new Map((cachedRows ?? []).map((row) => [row.species_key, row as RarityRow]));
  const now = Date.now();
  const staleNames = uniqueNames.filter(([key]) => {
    const checkedAt = cachedByKey.get(key)?.checked_at;
    return !checkedAt || now - Date.parse(checkedAt) >= CACHE_MAX_AGE_MS;
  });

  const refreshed = await mapConcurrent(staleNames, 5, async ([key, scientificName]) => {
    const count = await occurrenceCount(scientificName);
    const row = {
      species_key: key,
      scientific_name: scientificName,
      gbif_occurrences: count,
      rarity: classifyPlantRarity(count),
      checked_at: new Date().toISOString(),
    };
    const { data, error } = await admin.from('plant_rarities').upsert(row, { onConflict: 'species_key' }).select(FIELDS).single();
    if (error || !data) throw new Error('Impossible de mettre à jour le cache de rareté.');
    return data as RarityRow;
  });

  const refreshedByKey = new Map(refreshed.map((row) => [row.species_key, row]));
  const results = keys.map((key) => refreshedByKey.get(key) ?? cachedByKey.get(key)).filter((row): row is RarityRow => Boolean(row));
  return Response.json({ results }, { headers });
}));

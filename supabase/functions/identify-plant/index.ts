import { authenticate, endpoint, HttpError, readBounded } from '../_shared/http.ts';

interface Candidate { scientificName: string; commonName: string; family: string; score: number }

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function text(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, 200) : '';
}
function parseResults(value: unknown): Candidate[] {
  const root = record(value);
  if (!Array.isArray(root?.results)) throw new HttpError(502, 'Le service botanique a renvoyé une réponse invalide.');
  const candidates: Candidate[] = [];
  const seen = new Set<string>();
  for (const value of root.results) {
    const item = record(value);
    const species = record(item?.species);
    const scientificName = text(species?.scientificNameWithoutAuthor);
    const score = item?.score;
    if (!scientificName || typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 1) continue;
    const key = scientificName.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const names = species?.commonNames;
    candidates.push({
      scientificName,
      commonName: Array.isArray(names) ? text(names.find((name) => typeof name === 'string' && name.trim())) || scientificName : scientificName,
      family: text(record(species?.family)?.scientificNameWithoutAuthor),
      score,
    });
    if (candidates.length === 5) break;
  }
  if (!candidates.length) throw new HttpError(422, 'Aucune plante reconnue. Essaie une photo plus nette et plus proche.');
  return candidates;
}

Deno.serve(endpoint(async (request, headers) => {
  const { user, admin } = await authenticate(request);
  const key = Deno.env.get('PLANTNET_API_KEY');
  if (!key) throw new HttpError(503, 'La reconnaissance botanique n’est pas encore configurée.');
  const contentType = request.headers.get('Content-Type') ?? '';
  if (!contentType.startsWith('multipart/form-data;')) throw new HttpError(400, 'Une photo est attendue au format multipart.');
  const bytes = await readBounded(request, 5 * 1024 * 1024 + 65536);
  let form: FormData;
  try { form = await new Response(bytes, { headers: { 'Content-Type': contentType } }).formData(); }
  catch { throw new HttpError(400, 'La photo envoyée est illisible.'); }
  const image = form.get('image');
  const organ = form.get('organ');
  if (!(image instanceof File) || image.type !== 'image/jpeg' || image.size === 0 || image.size > 5 * 1024 * 1024) throw new HttpError(400, 'Envoie une photo JPEG de moins de 5 Mo.');
  if (typeof organ !== 'string' || !['auto', 'leaf', 'flower', 'fruit', 'bark'].includes(organ)) throw new HttpError(400, 'La partie de plante indiquée est invalide.');
  const signature = new Uint8Array(await image.slice(0, 3).arrayBuffer());
  if (signature[0] !== 255 || signature[1] !== 216 || signature[2] !== 255) throw new HttpError(400, 'Le fichier n’est pas une image JPEG valide.');
  const { data: quota, error: quotaError } = await admin.rpc('reserve_plant_scan', { p_user_id: user.id });
  if (quotaError) throw new HttpError(503, 'Impossible de vérifier le quota de scans. Réessaie plus tard.');
  if (quota === 'user_limit') throw new HttpError(429, 'Tu as atteint tes 20 essais du jour. Reviens demain (remise à zéro à minuit UTC).');
  if (quota === 'global_limit') throw new HttpError(429, 'Le quota gratuit partagé du site est atteint pour aujourd’hui. Reviens demain.');
  if (quota !== 'ok') throw new HttpError(503, 'La réservation du quota a échoué.');
  const outgoing = new FormData();
  outgoing.append('images', image, 'plante.jpg');
  outgoing.append('organs', organ);
  const url = new URL('https://my-api.plantnet.org/v2/identify/all');
  url.searchParams.set('api-key', key);
  url.searchParams.set('lang', 'fr');
  url.searchParams.set('include-related-images', 'false');
  let response: Response;
  try { response = await fetch(url, { method: 'POST', body: outgoing, signal: AbortSignal.timeout(25000) }); }
  catch { throw new HttpError(504, 'Le service botanique ne répond pas. Réessaie plus tard ; cet essai compte dans le quota.'); }
  if (response.status === 429) throw new HttpError(429, 'Le quota Pl@ntNet est atteint. Réessaie demain.');
  if (response.status === 404) throw new HttpError(422, 'Aucune plante reconnue sur cette photo. Essaie un autre cadrage.');
  if (!response.ok) throw new HttpError(502, 'Le service botanique est indisponible ou sa clé doit être vérifiée. Cet essai compte dans le quota.');
  let result: unknown;
  try { result = await response.json(); }
  catch { throw new HttpError(502, 'Le service botanique a renvoyé une réponse illisible.'); }
  return Response.json({ candidates: parseResults(result) }, { headers });
}));

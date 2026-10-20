import { createClient } from 'npm:@supabase/supabase-js@2';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function keyFromEnvironment(legacy: string, dictionary: string): string {
  const value = Deno.env.get(legacy);
  if (value) return value;
  const raw = Deno.env.get(dictionary);
  if (!raw) throw new HttpError(503, 'Le service de comptes n’est pas configuré.');
  let parsed: unknown;
  try { parsed = JSON.parse(raw); }
  catch { throw new HttpError(503, 'La configuration des clés serveur est invalide.'); }
  if (!parsed || typeof parsed !== 'object') throw new HttpError(503, 'La configuration des clés serveur est invalide.');
  const values = Object.values(parsed);
  const key = 'default' in parsed ? parsed.default : values.length === 1 ? values[0] : undefined;
  if (typeof key !== 'string' || !key) throw new HttpError(503, 'La clé serveur par défaut est absente.');
  return key;
}

export function cors(request: Request): Headers {
  const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8', 'Vary': 'Origin', 'Cache-Control': 'no-store' });
  const allowed = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map((origin) => origin.trim()).filter(Boolean);
  if (!allowed.length) throw new HttpError(503, 'Les origines autorisées ne sont pas configurées.');
  const origin = request.headers.get('Origin');
  if (!origin || !allowed.includes(origin)) throw new HttpError(403, 'Origine non autorisée.');
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'authorization, apikey, content-type, x-client-info');
  return headers;
}

export async function authenticate(request: Request) {
  const url = Deno.env.get('SUPABASE_URL');
  if (!url) throw new HttpError(503, 'Le service de comptes n’est pas configuré.');
  const token = request.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if (!token || token.length > 16384) throw new HttpError(401, 'Connecte-toi pour continuer.');
  const publicKey = keyFromEnvironment('SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEYS');
  const client = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, 'Ta session a expiré. Reconnecte-toi.');
  const secret = keyFromEnvironment('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEYS');
  const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  return { user: data.user, admin };
}

export async function readBounded(request: Request, maximum: number): Promise<Uint8Array<ArrayBuffer>> {
  const length = request.headers.get('Content-Length');
  if (length && (!/^\d+$/.test(length) || Number(length) > maximum)) throw new HttpError(413, 'Le fichier envoyé est trop volumineux.');
  if (!request.body) throw new HttpError(400, 'Le contenu de la requête est vide.');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maximum) { await reader.cancel(); throw new HttpError(413, 'Le fichier envoyé est trop volumineux.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return result;
}

export function endpoint(handler: (request: Request, headers: Headers) => Promise<Response>) {
  return async (request: Request): Promise<Response> => {
    let headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Vary': 'Origin' });
    try {
      headers = cors(request);
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
      if (request.method !== 'POST') throw new HttpError(405, 'Utilise une requête POST.');
      return await handler(request, headers);
    } catch (error) {
      const known = error instanceof HttpError;
      console.error(JSON.stringify({ event: 'request_failed', status: known ? error.status : 500, kind: known ? 'request' : 'internal' }));
      return Response.json({ error: known ? error.message : 'Une erreur serveur est survenue. Réessaie plus tard.' }, { status: known ? error.status : 500, headers });
    }
  };
}

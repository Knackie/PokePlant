// supabase/functions/_shared/http.ts
import { createClient } from "npm:@supabase/supabase-js@2";
var HttpError = class extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
  status;
};
function keyFromEnvironment(legacy, dictionary) {
  const value = Deno.env.get(legacy);
  if (value) return value;
  const raw = Deno.env.get(dictionary);
  if (!raw) throw new HttpError(503, "Le service de comptes n\u2019est pas configur\xE9.");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new HttpError(503, "La configuration des cl\xE9s serveur est invalide.");
  }
  if (!parsed || typeof parsed !== "object") throw new HttpError(503, "La configuration des cl\xE9s serveur est invalide.");
  const values = Object.values(parsed);
  const key = "default" in parsed ? parsed.default : values.length === 1 ? values[0] : void 0;
  if (typeof key !== "string" || !key) throw new HttpError(503, "La cl\xE9 serveur par d\xE9faut est absente.");
  return key;
}
function cors(request) {
  const headers = new Headers({ "Content-Type": "application/json; charset=utf-8", "Vary": "Origin", "Cache-Control": "no-store" });
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map((origin2) => origin2.trim()).filter(Boolean);
  if (!allowed.length) throw new HttpError(503, "Les origines autoris\xE9es ne sont pas configur\xE9es.");
  const origin = request.headers.get("Origin");
  if (!origin || !allowed.includes(origin)) throw new HttpError(403, "Origine non autoris\xE9e.");
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "authorization, apikey, content-type, x-client-info");
  return headers;
}
async function authenticate(request) {
  const url = Deno.env.get("SUPABASE_URL");
  if (!url) throw new HttpError(503, "Le service de comptes n\u2019est pas configur\xE9.");
  const token = request.headers.get("Authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token || token.length > 16384) throw new HttpError(401, "Connecte-toi pour continuer.");
  const publicKey = keyFromEnvironment("SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEYS");
  const client = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "Ta session a expir\xE9. Reconnecte-toi.");
  const secret = keyFromEnvironment("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEYS");
  const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  return { user: data.user, admin };
}
async function readBounded(request, maximum) {
  const length = request.headers.get("Content-Length");
  if (length && (!/^\d+$/.test(length) || Number(length) > maximum)) throw new HttpError(413, "Le fichier envoy\xE9 est trop volumineux.");
  if (!request.body) throw new HttpError(400, "Le contenu de la requ\xEAte est vide.");
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maximum) {
        await reader.cancel();
        throw new HttpError(413, "Le fichier envoy\xE9 est trop volumineux.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}
function endpoint(handler) {
  return async (request) => {
    let headers = new Headers({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Vary": "Origin" });
    try {
      headers = cors(request);
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
      if (request.method !== "POST") throw new HttpError(405, "Utilise une requ\xEAte POST.");
      return await handler(request, headers);
    } catch (error) {
      const known = error instanceof HttpError;
      console.error(JSON.stringify({ event: "request_failed", status: known ? error.status : 500, kind: known ? "request" : "internal" }));
      return Response.json({ error: known ? error.message : "Une erreur serveur est survenue. R\xE9essaie plus tard." }, { status: known ? error.status : 500, headers });
    }
  };
}

// supabase/functions/delete-account/index.ts
Deno.serve(endpoint(async (request, headers) => {
  const { user, admin } = await authenticate(request);
  const bytes = await readBounded(request, 1024);
  let body;
  try {
    body = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new HttpError(400, "La confirmation de suppression est invalide.");
  }
  if (!body || typeof body !== "object" || !("confirmation" in body) || body.confirmation !== "SUPPRIMER") throw new HttpError(400, "\xC9cris SUPPRIMER pour confirmer.");
  const storage = admin.storage.from("plant-photos");
  for (let page = 0; page < 100; page++) {
    const { data, error } = await storage.list(user.id, { limit: 100 });
    if (error) throw new HttpError(503, "La lecture des photos a \xE9chou\xE9. Ton compte est conserv\xE9 ; r\xE9essaie la suppression.");
    if (!data?.length) {
      const { error: deletionError } = await admin.auth.admin.deleteUser(user.id);
      if (deletionError) throw new HttpError(503, "Les photos ont \xE9t\xE9 supprim\xE9es, mais la suppression du compte a \xE9chou\xE9. R\xE9essaie.");
      return Response.json({ deleted: true }, { headers });
    }
    const paths = data.map((entry) => {
      if (!entry.id || entry.name.includes("/")) throw new HttpError(503, "Un fichier de stockage n\xE9cessite une intervention administrateur.");
      return `${user.id}/${entry.name}`;
    });
    const { error: removeError } = await storage.remove(paths);
    if (removeError) throw new HttpError(503, "La suppression de certaines photos a \xE9chou\xE9. Ton compte est conserv\xE9 ; r\xE9essaie.");
  }
  throw new HttpError(503, "La suppression des photos doit \xEAtre poursuivie. Relance la suppression du compte.");
}));

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

// supabase/functions/identify-plant/index.ts
function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function text(value) {
  return typeof value === "string" ? value.trim().slice(0, 200) : "";
}
function parseResults(value) {
  const root = record(value);
  if (!Array.isArray(root?.results)) throw new HttpError(502, "Le service botanique a renvoy\xE9 une r\xE9ponse invalide.");
  const candidates = [];
  const seen = /* @__PURE__ */ new Set();
  for (const value2 of root.results) {
    const item = record(value2);
    const species = record(item?.species);
    const scientificName = text(species?.scientificNameWithoutAuthor);
    const score = item?.score;
    if (!scientificName || typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 1) continue;
    const key = scientificName.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const names = species?.commonNames;
    candidates.push({
      scientificName,
      commonName: Array.isArray(names) ? text(names.find((name) => typeof name === "string" && name.trim())) || scientificName : scientificName,
      family: text(record(species?.family)?.scientificNameWithoutAuthor),
      score
    });
    if (candidates.length === 5) break;
  }
  if (!candidates.length) throw new HttpError(422, "Aucune plante reconnue. Essaie une photo plus nette et plus proche.");
  return candidates;
}
Deno.serve(endpoint(async (request, headers) => {
  const { user, admin } = await authenticate(request);
  const key = Deno.env.get("PLANTNET_API_KEY");
  if (!key) throw new HttpError(503, "La reconnaissance botanique n\u2019est pas encore configur\xE9e.");
  const contentType = request.headers.get("Content-Type") ?? "";
  if (!contentType.startsWith("multipart/form-data;")) throw new HttpError(400, "Une photo est attendue au format multipart.");
  const bytes = await readBounded(request, 5 * 1024 * 1024 + 65536);
  let form;
  try {
    form = await new Response(bytes, { headers: { "Content-Type": contentType } }).formData();
  } catch {
    throw new HttpError(400, "La photo envoy\xE9e est illisible.");
  }
  const image = form.get("image");
  const organ = form.get("organ");
  if (!(image instanceof File) || image.type !== "image/jpeg" || image.size === 0 || image.size > 5 * 1024 * 1024) throw new HttpError(400, "Envoie une photo JPEG de moins de 5 Mo.");
  if (typeof organ !== "string" || !["auto", "leaf", "flower", "fruit", "bark"].includes(organ)) throw new HttpError(400, "La partie de plante indiqu\xE9e est invalide.");
  const signature = new Uint8Array(await image.slice(0, 3).arrayBuffer());
  if (signature[0] !== 255 || signature[1] !== 216 || signature[2] !== 255) throw new HttpError(400, "Le fichier n\u2019est pas une image JPEG valide.");
  const { data: quota, error: quotaError } = await admin.rpc("reserve_plant_scan", { p_user_id: user.id });
  if (quotaError) throw new HttpError(503, "Impossible de v\xE9rifier le quota de scans. R\xE9essaie plus tard.");
  if (quota === "user_limit") throw new HttpError(429, "Tu as atteint tes 20 essais du jour. Reviens demain (remise \xE0 z\xE9ro \xE0 minuit UTC).");
  if (quota === "global_limit") throw new HttpError(429, "Le quota gratuit partag\xE9 du site est atteint pour aujourd\u2019hui. Reviens demain.");
  if (quota !== "ok") throw new HttpError(503, "La r\xE9servation du quota a \xE9chou\xE9.");
  const outgoing = new FormData();
  outgoing.append("images", image, "plante.jpg");
  outgoing.append("organs", organ);
  const url = new URL("https://my-api.plantnet.org/v2/identify/all");
  url.searchParams.set("api-key", key);
  url.searchParams.set("lang", "fr");
  url.searchParams.set("include-related-images", "false");
  let response;
  try {
    response = await fetch(url, { method: "POST", body: outgoing, signal: AbortSignal.timeout(25e3) });
  } catch {
    throw new HttpError(504, "Le service botanique ne r\xE9pond pas. R\xE9essaie plus tard ; cet essai compte dans le quota.");
  }
  if (response.status === 429) throw new HttpError(429, "Le quota Pl@ntNet est atteint. R\xE9essaie demain.");
  if (response.status === 404) throw new HttpError(422, "Aucune plante reconnue sur cette photo. Essaie un autre cadrage.");
  if (!response.ok) throw new HttpError(502, "Le service botanique est indisponible ou sa cl\xE9 doit \xEAtre v\xE9rifi\xE9e. Cet essai compte dans le quota.");
  let result;
  try {
    result = await response.json();
  } catch {
    throw new HttpError(502, "Le service botanique a renvoy\xE9 une r\xE9ponse illisible.");
  }
  return Response.json({ candidates: parseResults(result) }, { headers });
}));

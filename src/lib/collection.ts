import type { Candidate, Capture } from '../types';
import { requireSupabase } from './supabase';

export async function loadCollection(userId: string, photoUrlTtlSeconds = 3600): Promise<Capture[]> {
  const client = requireSupabase();
  const { data, error } = await client.from('captures').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  const captures: Capture[] = data ?? [];
  if (!captures.length) return captures;
  const { data: urls, error: photoError } = await client.storage.from('plant-photos').createSignedUrls(captures.map((capture) => capture.photo_path), photoUrlTtlSeconds);
  if (photoError) throw photoError;
  if (urls?.some((entry) => entry.error)) throw new Error('Certaines photos sont indisponibles. Recharge ta collection ou contacte l’administrateur.');
  const byPath = new Map(urls?.map((entry) => [entry.path, entry.signedUrl]));
  return captures.map((capture) => {
    const photoUrl = byPath.get(capture.photo_path);
    if (!photoUrl) throw new Error('Le stockage n’a pas fourni de lien pour une photo. Réessaie de charger ton carnet.');
    return { ...capture, photoUrl };
  });
}

export async function saveCapture(userId: string, candidate: Candidate, photo: File, replaceCaptureId?: string): Promise<string | null> {
  const client = requireSupabase();
  const path = `${userId}/${crypto.randomUUID()}.jpg`;
  const { error: uploadError } = await client.storage.from('plant-photos').upload(path, photo, { contentType: 'image/jpeg', upsert: false });
  if (uploadError) throw uploadError;
  if (replaceCaptureId) {
    const { data: oldPhotoPath, error } = await client.rpc('replace_plant_capture', {
      p_capture_id: replaceCaptureId,
      p_scientific_name: candidate.scientificName,
      p_common_name: candidate.commonName,
      p_family: candidate.family,
      p_score: candidate.score,
      p_photo_path: path,
    });
    if (error) {
      const { error: cleanupError } = await client.storage.from('plant-photos').remove([path]);
      throw new Error(cleanupError
        ? `Le remplacement a échoué : ${error.message}. Le nettoyage de la nouvelle photo a aussi échoué : ${cleanupError.message}. Contacte l’administrateur.`
        : error.message);
    }
    if (!oldPhotoPath) throw new Error('La photo a été remplacée, mais l’ancienne adresse de photo est introuvable. Recharge ton Plantédex.');
    const { error: cleanupError } = await client.storage.from('plant-photos').remove([oldPhotoPath]);
    return cleanupError
      ? `La nouvelle photo est enregistrée, mais l’ancienne n’a pas pu être supprimée du stockage : ${cleanupError.message}. Recharge ton Plantédex ou contacte l’administrateur.`
      : null;
  }
  const { error } = await client.from('captures').insert({
    user_id: userId,
    scientific_name: candidate.scientificName,
    common_name: candidate.commonName,
    family: candidate.family,
    score: candidate.score,
    photo_path: path,
  });
  if (error) {
    const { error: cleanupError } = await client.storage.from('plant-photos').remove([path]);
    const message = error.code === '23505' ? 'Cette espèce est déjà dans ton Plantédex : pas besoin de la capturer deux fois !' : error.message;
    throw new Error(cleanupError ? `${message} Le nettoyage de la photo a échoué : ${cleanupError.message}. Contacte l’administrateur.` : message);
  }
  return null;
}

export function isCandidate(value: unknown): value is Candidate {
  if (!value || typeof value !== 'object') return false;
  return 'scientificName' in value && typeof value.scientificName === 'string' && value.scientificName.trim().length > 0
    && 'commonName' in value && typeof value.commonName === 'string'
    && 'family' in value && typeof value.family === 'string'
    && 'score' in value && typeof value.score === 'number' && Number.isFinite(value.score) && value.score >= 0 && value.score <= 1;
}

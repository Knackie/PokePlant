import { authenticate, endpoint, HttpError, readBounded } from '../_shared/http.ts';

Deno.serve(endpoint(async (request, headers) => {
  const { user, admin } = await authenticate(request);
  const bytes = await readBounded(request, 1024);
  let body: unknown;
  try { body = JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new HttpError(400, 'La confirmation de suppression est invalide.'); }
  if (!body || typeof body !== 'object' || !('confirmation' in body) || body.confirmation !== 'SUPPRIMER') throw new HttpError(400, 'Écris SUPPRIMER pour confirmer.');
  const storage = admin.storage.from('plant-photos');
  // Always read the first page again after deleting it: offsets would skip files.
  for (let page = 0; page < 100; page++) {
    const { data, error } = await storage.list(user.id, { limit: 100 });
    if (error) throw new HttpError(503, 'La lecture des photos a échoué. Ton compte est conservé ; réessaie la suppression.');
    if (!data?.length) {
      const { error: deletionError } = await admin.auth.admin.deleteUser(user.id);
      if (deletionError) throw new HttpError(503, 'Les photos ont été supprimées, mais la suppression du compte a échoué. Réessaie.');
      return Response.json({ deleted: true }, { headers });
    }
    const paths = data.map((entry) => {
      if (!entry.id || entry.name.includes('/')) throw new HttpError(503, 'Un fichier de stockage nécessite une intervention administrateur.');
      return `${user.id}/${entry.name}`;
    });
    const { error: removeError } = await storage.remove(paths);
    if (removeError) throw new HttpError(503, 'La suppression de certaines photos a échoué. Ton compte est conservé ; réessaie.');
  }
  throw new HttpError(503, 'La suppression des photos doit être poursuivie. Relance la suppression du compte.');
}));

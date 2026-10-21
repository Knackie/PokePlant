import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isCandidate, loadCollection, saveCapture } from './collection';
import type { Candidate } from '../types';

const mock = vi.hoisted(() => ({ upload: vi.fn(), remove: vi.fn(), insert: vi.fn(), rpc: vi.fn(), signedUrls: vi.fn(), select: vi.fn(), eq: vi.fn(), order: vi.fn() }));
vi.mock('./supabase', () => ({
  requireSupabase: () => ({
    storage: { from: () => ({ upload: mock.upload, remove: mock.remove, createSignedUrls: mock.signedUrls }) },
    from: () => ({ insert: mock.insert, select: mock.select }),
    rpc: mock.rpc,
  }),
}));
const candidate: Candidate = { scientificName: 'Monstera deliciosa', commonName: 'Monstera', family: 'Araceae', score: .95 };
const photo = new File(['photo'], 'plante.jpg', { type: 'image/jpeg' });

describe('validation des identifications', () => {
  it('accepte le contrat attendu, y compris les scores limites', () => {
    expect(isCandidate(candidate)).toBe(true);
    expect(isCandidate({ ...candidate, score: 0 })).toBe(true);
    expect(isCandidate({ ...candidate, score: 1 })).toBe(true);
  });
  it.each([null, {}, { ...candidate, score: -1 }, { ...candidate, score: 2 }, { ...candidate, score: NaN }, { ...candidate, score: Infinity }, { ...candidate, scientificName: '' }, { ...candidate, family: null }])('refuse un résultat malformé', (value) => {
    expect(isCandidate(value)).toBe(false);
  });
});

describe('sauvegarde d’une capture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mock.upload.mockResolvedValue({ error: null });
    mock.insert.mockResolvedValue({ error: null });
    mock.rpc.mockResolvedValue({ data: 'owner/old-photo.jpg', error: null });
    mock.remove.mockResolvedValue({ error: null });
  });

  describe('chargement privé de la collection', () => {
    const row = { id: 'capture', user_id: 'owner', scientific_name: 'Monstera deliciosa', common_name: 'Monstera', family: 'Araceae', score: .9, species_key: 'monstera deliciosa', photo_path: 'owner/photo.jpg', created_at: '2026-10-20T12:00:00Z' };
    beforeEach(() => {
      vi.clearAllMocks();
      mock.select.mockReturnValue({ eq: mock.eq });
      mock.eq.mockReturnValue({ order: mock.order });
      mock.order.mockResolvedValue({ data: [row], error: null });
      mock.signedUrls.mockResolvedValue({ data: [{ path: row.photo_path, signedUrl: 'https://private.example/photo?token=temporary' }], error: null });
    });
    it('filtre par propriétaire et utilise uniquement des liens temporaires', async () => {
      const result = await loadCollection('owner');
      expect(mock.eq).toHaveBeenCalledWith('user_id', 'owner');
      expect(mock.signedUrls).toHaveBeenCalledWith(['owner/photo.jpg'], 3600);
      expect(result[0].photoUrl).toBe('https://private.example/photo?token=temporary');
    });
    it('ne sollicite pas le stockage pour une collection vide', async () => {
      mock.order.mockResolvedValue({ data: [], error: null });
      expect(await loadCollection('owner')).toEqual([]);
      expect(mock.signedUrls).not.toHaveBeenCalled();
    });
    it('signale une erreur de base au lieu de prétendre que la collection est vide', async () => {
      mock.order.mockResolvedValue({ data: null, error: new Error('base indisponible') });
      await expect(loadCollection('owner')).rejects.toThrow('base indisponible');
    });
    it('signale une erreur globale du stockage', async () => {
      mock.signedUrls.mockResolvedValue({ data: null, error: new Error('stockage indisponible') });
      await expect(loadCollection('owner')).rejects.toThrow('stockage indisponible');
    });
    it('signale une erreur propre à une photo', async () => {
      mock.signedUrls.mockResolvedValue({ data: [{ path: row.photo_path, error: 'not found' }], error: null });
      await expect(loadCollection('owner')).rejects.toThrow('Certaines photos sont indisponibles');
    });
    it('rejette un lien absent ou nul', async () => {
      mock.signedUrls.mockResolvedValue({ data: [{ path: row.photo_path, signedUrl: null }], error: null });
      await expect(loadCollection('owner')).rejects.toThrow('n’a pas fourni de lien');
    });
  });
  it('enregistre une photo privée et sa fiche sans simuler le succès', async () => {
    expect(await saveCapture('owner', candidate, photo)).toBeNull();
    expect(mock.upload).toHaveBeenCalledWith(expect.stringMatching(/^owner\/[0-9a-f-]+\.jpg$/), photo, { contentType: 'image/jpeg', upsert: false });
    expect(mock.insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'owner', scientific_name: candidate.scientificName, score: .95 }));
    expect(mock.remove).not.toHaveBeenCalled();
  });
  it('arrête la sauvegarde quand le téléversement échoue', async () => {
    mock.upload.mockResolvedValue({ error: new Error('Stockage indisponible') });
    await expect(saveCapture('owner', candidate, photo)).rejects.toThrow('Stockage indisponible');
    expect(mock.insert).not.toHaveBeenCalled();
  });
  it('nettoie la photo et signale les espèces déjà capturées', async () => {
    mock.insert.mockResolvedValue({ error: { code: '23505', message: 'duplicate' } });
    await expect(saveCapture('owner', candidate, photo)).rejects.toThrow('déjà dans ton Plantédex');
    expect(mock.remove).toHaveBeenCalledWith([mock.upload.mock.calls[0][0]]);
  });
  it('remonte aussi une erreur de nettoyage au lieu de la masquer', async () => {
    mock.insert.mockResolvedValue({ error: { code: '400', message: 'base indisponible' } });
    mock.remove.mockResolvedValue({ error: { message: 'stockage indisponible' } });
    await expect(saveCapture('owner', candidate, photo)).rejects.toThrow('Le nettoyage de la photo a échoué');
  });
  it('remplace la photo d’une capture existante et garde la collection sans XP supplémentaire', async () => {
    expect(await saveCapture('owner', candidate, photo, 'capture-id')).toBeNull();
    expect(mock.rpc).toHaveBeenCalledWith('replace_plant_capture', expect.objectContaining({
      p_capture_id: 'capture-id',
      p_scientific_name: candidate.scientificName,
      p_photo_path: expect.stringMatching(/^owner\/[0-9a-f-]+\.jpg$/),
    }));
    expect(mock.remove).toHaveBeenCalledWith(['owner/old-photo.jpg']);
    expect(mock.insert).not.toHaveBeenCalled();
  });
  it('nettoie la nouvelle photo et conserve l’ancienne si le remplacement échoue', async () => {
    mock.rpc.mockResolvedValue({ data: null, error: new Error('Remplacement refusé') });
    await expect(saveCapture('owner', candidate, photo, 'capture-id')).rejects.toThrow('Remplacement refusé');
    expect(mock.remove).toHaveBeenCalledWith([mock.upload.mock.calls[0][0]]);
  });
  it('signale explicitement si seule la suppression de l’ancienne photo échoue', async () => {
    mock.remove.mockResolvedValue({ error: { message: 'Stockage indisponible' } });
    await expect(saveCapture('owner', candidate, photo, 'capture-id')).resolves.toMatch(/nouvelle photo est enregistrée.*ancienne/i);
    expect(mock.remove).toHaveBeenCalledWith(['owner/old-photo.jpg']);
  });
});

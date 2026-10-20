import { describe, expect, it } from 'vitest';
import { functionError, requireSupabase, supabase } from './supabase';

describe('erreurs des services', () => {
  it('remonte les messages JSON explicites des fonctions', async () => {
    const error = { context: new Response(JSON.stringify({ error: 'Quota quotidien atteint.' }), { status: 429 }) };
    expect(await functionError(error)).toBe('Quota quotidien atteint.');
  });
  it('signale les réponses non JSON au lieu de masquer le code serveur', async () => {
    expect(await functionError({ context: new Response('not json', { status: 502 }) })).toContain('502');
  });
  it('préserve les messages des erreurs de base et des exceptions', async () => {
    expect(await functionError({ message: 'Accès refusé.' })).toBe('Accès refusé.');
    expect(await functionError(new Error('Échec réseau.'))).toBe('Échec réseau.');
  });
  it('a un message explicite pour les erreurs inconnues', async () => {
    expect(await functionError(undefined)).toBe('Une erreur inattendue est survenue.');
  });
  it('n’invente pas de service quand le projet n’est pas configuré', () => {
    if (!supabase) expect(requireSupabase).toThrow('comptes ne sont pas encore configurés');
  });
});

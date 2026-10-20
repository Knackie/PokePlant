import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
const configured = Boolean(url && key && !url.includes('YOUR_PROJECT') && !key.includes('YOUR_PUBLIC'));

export const supabase = configured && url && key ? createClient<Database>(url, key) : null;

export function requireSupabase() {
  if (!supabase) throw new Error('Les comptes ne sont pas encore configurés. Consulte le guide d’installation Supabase.');
  return supabase;
}

export async function functionError(error: unknown): Promise<string> {
  if (error && typeof error === 'object' && 'context' in error && error.context instanceof Response) {
    const response = error.context;
    try {
      const data: unknown = await response.json();
      if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') return data.error;
    } catch {
      return `Le serveur a renvoyé une réponse illisible (${response.status}). Réessaie plus tard.`;
    }
  }
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message;
  return 'Une erreur inattendue est survenue.';
}

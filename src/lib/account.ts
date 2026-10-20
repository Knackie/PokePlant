import type { User } from '@supabase/supabase-js';

export function explorerName(user: User | null | undefined): string {
  for (const name of [user?.user_metadata.display_name, user?.user_metadata.full_name, user?.user_metadata.name]) {
    if (typeof name === 'string' && name.trim()) return name.trim();
  }
  return 'Explorateur';
}

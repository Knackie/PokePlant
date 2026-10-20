import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Crown, Medal, Trophy } from 'lucide-react';
import type { LeaderboardRow } from '../types';
import { explorerName } from '../lib/account';
import { functionError, requireSupabase } from '../lib/supabase';

export function Leaderboard({ user, speciesCount, onAuth }: { user: User | null; speciesCount: number; onAuth: () => void }) {
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [joined, setJoined] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const userId = user?.id;

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const client = requireSupabase();
      const [board, mine] = await Promise.all([
        client.rpc('get_leaderboard'),
        client.from('leaderboard_profiles').select('user_id').eq('user_id', userId).maybeSingle(),
      ]);
      if (board.error) throw board.error;
      if (mine.error) throw mine.error;
      setRows(board.data ?? []); setJoined(Boolean(mine.data)); setError('');
    } catch (failure) { setError(await functionError(failure)); }
  }, [userId]);

  useEffect(() => { setRows(null); void load(); }, [load, speciesCount]);

  async function toggle() {
    if (!user) return;
    setBusy(true); setError('');
    try {
      const client = requireSupabase();
      const { error: failure } = joined
        ? await client.from('leaderboard_profiles').delete().eq('user_id', user.id)
        : await client.from('leaderboard_profiles').upsert({ user_id: user.id, display_name: explorerName(user).slice(0, 30).padEnd(2, ' ') });
      if (failure) throw failure;
      await load();
    } catch (failure) { setError(await functionError(failure)); }
    finally { setBusy(false); }
  }

  if (!user) return <section className="panel leaderboard"><h3><Trophy size={20} /> Classement des explorateurs</h3><p className="muted">Connecte-toi pour voir le top 10 et y participer.</p><button className="button primary" onClick={onAuth}>Me connecter</button></section>;
  return <section className="panel leaderboard">
    <h3><Trophy size={20} /> Classement des explorateurs</h3>
    <p className="muted">Les 10 premiers selon l’XP. Seuls les joueurs qui l’ont choisi apparaissent, avec leur nom d’explorateur.</p>
    <label className="checkbox-label"><input type="checkbox" checked={joined} onChange={() => void toggle()} disabled={busy || rows === null} /><span>Apparaître dans le classement avec mon nom « {explorerName(user)} »</span></label>
    {error && <p role="alert" className="error-box">{error}</p>}
    {rows === null && !error ? <p className="muted">Chargement…</p> : rows && (rows.length ? <ol className="leaderboard-list">{rows.map((row) => <li key={row.rank} className={row.is_me ? 'me' : ''}><span className="rank">{row.rank === 1 ? <Crown size={16} /> : row.rank <= 3 ? <Medal size={16} /> : row.rank}</span><strong>{row.display_name}{row.is_me ? ' (toi)' : ''}</strong><span>Niv. {row.level} · {row.xp} XP</span></li>)}</ol> : <p className="muted">Personne n’est encore au classement. Sois le premier !</p>)}
  </section>;
}

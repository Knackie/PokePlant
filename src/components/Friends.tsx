import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { User } from '@supabase/supabase-js';
import { Check, Copy, Images, Search, UserPlus, Users, X } from 'lucide-react';
import { progression } from '../game';
import { explorerName } from '../lib/account';
import { loadCollection } from '../lib/collection';
import { functionError, requireSupabase } from '../lib/supabase';
import type { Capture, FriendConnection, FriendSearchResult } from '../types';

export function Friends({ user, onAuth }: { user: User | null; onAuth: () => void }) {
  const [friendCode, setFriendCode] = useState('');
  const [connections, setConnections] = useState<FriendConnection[]>([]);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<FriendSearchResult[]>([]);
  const [sharedCollection, setSharedCollection] = useState<{ friendId: string; captures: Capture[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const userId = user?.id;
  const currentName = explorerName(user).trim().replace(/\s+/g, ' ');
  const displayName = currentName.length < 2 ? 'Explorateur' : currentName.slice(0, 30);

  const reload = useCallback(async () => {
    if (!userId) return;
    const { data, error: failure } = await requireSupabase().rpc('get_friend_connections');
    if (failure) throw failure;
    setConnections(data ?? []);
  }, [userId]);

  useEffect(() => {
    let active = true;
    async function initialize() {
      if (!userId) return;
      setLoading(true);
      setError('');
      try {
        const { data, error: profileError } = await requireSupabase()
          .from('friend_profiles')
          .upsert({ user_id: userId, display_name: displayName }, { onConflict: 'user_id' })
          .select('friend_code')
          .single();
        if (profileError) throw profileError;
        await reload();
        if (active) setFriendCode(data.friend_code);
      } catch (failure) {
        if (active) setError(await functionError(failure));
      } finally {
        if (active) setLoading(false);
      }
    }
    void initialize();
    return () => { active = false; };
  }, [userId, displayName, reload]);

  async function searchPlayers(event: FormEvent) {
    event.preventDefault();
    const name = search.trim();
    if (name.length < 2) {
      setError('Saisis au moins deux caractères du pseudo.');
      return;
    }
    setSearching(true);
    setError('');
    setNotice('');
    try {
      const { data, error: failure } = await requireSupabase().rpc('search_friend_players', { p_display_name: name });
      if (failure) throw failure;
      setResults(data ?? []);
      if (!data?.length) setNotice('Aucun joueur trouvé avec ce pseudo exact ou ce code ami. Demande-lui d’ouvrir l’onglet Amis pour être trouvable.');
    } catch (failure) {
      setError(await functionError(failure));
    } finally {
      setSearching(false);
    }
  }

  async function sendRequest(player: FriendSearchResult) {
    setBusyId(player.friend_code);
    setError('');
    setNotice('');
    try {
      const { error: failure } = await requireSupabase().rpc('send_friend_request', { p_friend_code: player.friend_code });
      if (failure) throw failure;
      setNotice(`Demande envoyée à ${player.display_name}. Il faudra qu’il ou elle l’accepte.`);
      await reload();
    } catch (failure) {
      setError(await functionError(failure));
    } finally {
      setBusyId('');
    }
  }

  async function respond(requestId: string, accept: boolean) {
    setBusyId(requestId);
    setError('');
    setNotice('');
    try {
      const { error: failure } = await requireSupabase().rpc('respond_friend_request', { p_request_id: requestId, p_accept: accept });
      if (failure) throw failure;
      setNotice(accept ? 'Vous êtes maintenant amis !' : 'Demande refusée.');
      await reload();
    } catch (failure) {
      setError(await functionError(failure));
    } finally {
      setBusyId('');
    }
  }

  async function remove(requestId: string, name: string) {
    if (!window.confirm(`Retirer ${name} de tes amis ?`)) return;
    setBusyId(requestId);
    setError('');
    setNotice('');
    try {
      const { error: failure } = await requireSupabase().rpc('remove_friend', { p_request_id: requestId });
      if (failure) throw failure;
      setSharedCollection(null);
      setNotice(`${name} a été retiré de tes amis.`);
      await reload();
    } catch (failure) {
      setError(await functionError(failure));
    } finally {
      setBusyId('');
    }
  }

  async function showCollection(friendId: string) {
    if (sharedCollection?.friendId === friendId) {
      setSharedCollection(null);
      return;
    }
    setBusyId(friendId);
    setError('');
    try {
      const captures = await loadCollection(friendId, 300);
      setSharedCollection({ friendId, captures });
    } catch (failure) {
      setError(await functionError(failure));
    } finally {
      setBusyId('');
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(friendCode);
      setNotice('Code ami copié.');
      setError('');
    } catch (failure) {
      setError(await functionError(failure));
    }
  }

  if (!user) {
    return <section className="panel friends-intro">
      <h2><Users size={22} /> Les amis de PokePlant</h2>
      <p className="muted">Connecte-toi pour ajouter des amis, comparer vos niveaux et découvrir leurs collections après acceptation de leur demande.</p>
      <button className="button primary" onClick={onAuth}>Me connecter</button>
    </section>;
  }

  const incoming = connections.filter((connection) => connection.status === 'pending' && connection.incoming);
  const outgoing = connections.filter((connection) => connection.status === 'pending' && !connection.incoming);
  const friends = connections.filter((connection) => connection.status === 'accepted');

  return <div className="friends-page">
    <section className="panel friends-code-card">
      <div><span className="eyebrow">TON PSEUDO</span><h2>{displayName}</h2><p className="muted">Tes amis peuvent te retrouver avec ton pseudo exact.</p></div>
      <div className="friend-code"><span><small>TON CODE AMI</small><strong>{loading ? '…' : friendCode || '—'}</strong></span><button type="button" className="button secondary" onClick={() => void copyCode()} disabled={!friendCode}><Copy size={16} />Copier</button></div>
    </section>

    <section className="panel friends-search-card">
      <h2><UserPlus size={21} /> Ajouter un ami</h2>
      <p className="muted">Saisis son pseudo exact ou son code ami. En cas d’homonymes, compare le code avec la personne.</p>
      <form className="friends-search" onSubmit={(event) => void searchPlayers(event)}>
        <label className="search-field"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pseudo ou code ami" maxLength={30} /></label>
        <button className="button primary" disabled={searching || loading}>{searching ? 'Recherche…' : 'Rechercher'}</button>
      </form>
      {results.length > 0 && <ul className="friends-results">{results.map((player) => <li key={player.friend_code}><span><strong>{player.display_name}</strong><small>Code ami : {player.friend_code}</small></span><button className="button secondary" onClick={() => void sendRequest(player)} disabled={busyId !== ''}><UserPlus size={16} />{busyId === player.friend_code ? 'Envoi…' : 'Ajouter'}</button></li>)}</ul>}
    </section>

    {error && <p role="alert" className="error-box">{error}</p>}
    {notice && <p role="status" className="success-box">{notice}</p>}

    <section className="friends-connections">
      <h2><Users size={21} /> Demandes reçues {incoming.length > 0 && <span className="friends-count">{incoming.length}</span>}</h2>
      {loading ? <p className="muted">Chargement de tes amis…</p> : incoming.length === 0 ? <p className="muted">Tu n’as pas de demande en attente.</p> : <ul className="friends-list">{incoming.map((connection) => <li className="panel friend-row" key={connection.request_id}><div><strong>{connection.display_name}</strong><small>Code ami : {connection.friend_code}</small></div><div className="friend-actions"><button className="button primary" onClick={() => void respond(connection.request_id, true)} disabled={busyId !== ''}><Check size={16} />Accepter</button><button className="button secondary" onClick={() => void respond(connection.request_id, false)} disabled={busyId !== ''}><X size={16} />Refuser</button></div></li>)}</ul>}
    </section>

    <section className="friends-connections">
      <h2><Users size={21} /> Mes amis {friends.length > 0 && <span className="friends-count">{friends.length}</span>}</h2>
      {!loading && friends.length === 0 && <p className="muted">Tes amis apparaîtront ici après acceptation d’une demande.</p>}
      <ul className="friends-list">{friends.map((friend) => {
        const isOpen = sharedCollection?.friendId === friend.friend_id;
        const friendStats = isOpen ? progression(sharedCollection.captures) : null;
        return <li className="panel friend-row friend-card" key={friend.request_id}>
          <div className="friend-summary"><div><strong>{friend.display_name}</strong><small>Code ami : {friend.friend_code}</small></div><span className="level-pill">Niveau {friend.level} · {friend.xp} XP</span></div>
          <div className="friend-actions"><button className="button secondary" onClick={() => void showCollection(friend.friend_id)} disabled={busyId !== ''}><Images size={16} />{busyId === friend.friend_id ? 'Chargement…' : isOpen ? 'Masquer la collection' : `Voir ses plantes (${friend.species})`}</button><button className="text-button danger-text" onClick={() => void remove(friend.request_id, friend.display_name)} disabled={busyId !== ''}>Retirer</button></div>
          {isOpen && sharedCollection && <div className="friend-collection"><div className="friend-collection-heading"><h3>Plantédex de {friend.display_name}</h3>{friendStats && <span>{friendStats.species} espèces · {friendStats.xp} XP · niveau {friendStats.level}</span>}</div>{sharedCollection.captures.length === 0 ? <p className="muted">Cette collection n’a pas encore de plante.</p> : <div className="friend-photos">{sharedCollection.captures.map((capture) => <article className="friend-photo" key={capture.id}><img src={capture.photoUrl} alt={`Photo de ${capture.common_name}`} loading="lazy" /><div><strong>{capture.common_name}</strong><small>{capture.scientific_name}</small></div></article>)}</div>}<p className="fine">Les photos partagées sont visibles uniquement entre amis. Le lien temporaire des images expire après quelques minutes.</p></div>}
        </li>;
      })}</ul>
    </section>

    <section className="friends-connections">
      <h2>Demandes envoyées</h2>
      {!loading && outgoing.length === 0 && <p className="muted">Tu n’as pas de demande en attente.</p>}
      <ul className="friends-list">{outgoing.map((connection) => <li className="panel friend-row" key={connection.request_id}><div><strong>{connection.display_name}</strong><small>En attente de sa réponse</small></div><button className="text-button" onClick={() => void remove(connection.request_id, connection.display_name)} disabled={busyId !== ''}>Annuler</button></li>)}</ul>
    </section>
  </div>;
}

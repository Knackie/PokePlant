import { useState, type FormEvent } from 'react';
import type { User } from '@supabase/supabase-js';
import { Download, LogOut, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import type { Capture } from '../types';
import { progression } from '../game';
import { functionError, requireSupabase } from '../lib/supabase';
import { Modal } from './Modal';
import { explorerName } from '../lib/account';

export function Profile({ user, captures, onAuth }: { user: User | null; captures: Capture[]; onAuth: () => void }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [notice, setNotice] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const stats = progression(captures);
  const displayName = user ? explorerName(user) : 'Explorateur en devenir';
  async function signOut() {
    setBusy(true); setError('');
    try {
      const { error } = await requireSupabase().auth.signOut();
      if (error) throw error;
    } catch (error) { setError(await functionError(error)); }
    finally { setBusy(false); }
  }
  async function saveName(event: FormEvent) {
    event.preventDefault();
    const name = nameDraft.trim().replace(/\s+/g, ' ');
    if (name.length < 2 || name.length > 30) { setError('Choisis un nom de 2 à 30 caractères.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const client = requireSupabase();
      const { error: authError } = await client.auth.updateUser({ data: { display_name: name } });
      if (authError) throw authError;
      const [leaderboard, friends] = await Promise.all([
        client.from('leaderboard_profiles').update({ display_name: name }).eq('user_id', user!.id),
        client.from('friend_profiles').update({ display_name: name }).eq('user_id', user!.id),
      ]);
      if (leaderboard.error) throw leaderboard.error;
      if (friends.error) throw friends.error;
      setEditing(false); setNotice('Nom enregistré !');
    } catch (error) { setError(await functionError(error)); }
    finally { setBusy(false); }
  }
  function exportData() {
    const data = { exported_at: new Date().toISOString(), profile: { email: user?.email, display_name: explorerName(user) }, captures: captures.map(({ photoUrl: _url, ...capture }) => capture) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = 'pokeplant-mes-decouvertes.json'; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function deleteAccount(event: FormEvent) {
    event.preventDefault();
    if (confirmation !== 'SUPPRIMER') return;
    setBusy(true); setError('');
    try {
      const { error } = await requireSupabase().functions.invoke('delete-account', { body: { confirmation } });
      if (error) throw error;
      const { error: logoutError } = await requireSupabase().auth.signOut({ scope: 'local' });
      if (logoutError) throw new Error(`Ton compte a été supprimé, mais la fermeture de session a échoué : ${logoutError.message}. Ferme ce navigateur.`);
      setConfirm(false);
    } catch (error) { setError(await functionError(error)); }
    finally { setBusy(false); }
  }
  return <div className="profile-grid">
    <section className="panel profile-card"><div className="profile-avatar"><UserRound size={38} /></div><span className="eyebrow">CARTE D’EXPLORATEUR</span><h2>{displayName}</h2>{user && !editing && <button className="text-button" onClick={() => { setNameDraft(displayName === 'Explorateur' ? '' : displayName); setError(''); setNotice(''); setEditing(true); }}>Changer mon nom</button>}{editing && <form className="form-stack" onSubmit={saveName}><label>Nouveau nom<input value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} minLength={2} maxLength={30} required autoComplete="nickname" disabled={busy} /></label><button className="button primary" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button><button type="button" className="text-button" onClick={() => setEditing(false)} disabled={busy}>Annuler</button></form>}{notice && <p role="status" className="success-box">{notice}</p>}{editing && error && <p role="alert" className="error-box">{error}</p>}<p className="muted">{user?.email || 'Chaque grande aventure commence par une petite pousse.'}</p><span className="level-pill">Niveau {stats.level} · {stats.xp} XP</span><div className="profile-stats"><div><strong>{stats.species}</strong><span>espèces</span></div><div><strong>{stats.families}</strong><span>familles</span></div></div>{!user && <button className="button primary full" onClick={onAuth}>Créer mon compte gratuit</button>}</section>
    <section className="panel settings-card"><h3>Ton jardin, tes données</h3><div className="privacy-note"><ShieldCheck size={24} /><p>Toi seul vois ta collection, sauf tes amis acceptés qui peuvent consulter tes plantes et leurs photos. Tu n’apparais au classement que si tu le choisis. Aucune publicité.</p></div>
      <p className="muted">L’export JSON contient les informations de tes découvertes, pas les fichiers photo. Conserve les originaux de tes photos sur ton appareil.</p>
      <button className="settings-action" onClick={exportData} disabled={!user || busy}><Download size={20} /><span>Exporter mes découvertes<small>Télécharger mon carnet au format JSON</small></span></button>
      <button className="settings-action" onClick={signOut} disabled={!user || busy}><LogOut size={20} /><span>Me déconnecter<small>Ma collection restera sauvegardée</small></span></button>
      <button className="settings-action danger" onClick={() => { setError(''); setConfirm(true); }} disabled={!user || busy}><Trash2 size={20} /><span>Supprimer mon compte<small>Effacer définitivement mon compte et mes photos</small></span></button>
      {error && !confirm && <p role="alert" className="error-box">{error}</p>}
    </section>
    <section className="panel about-card"><div className="eyebrow">UNE AVENTURE RESPECTUEUSE</div><h3>On capture des souvenirs. Pas la nature.</h3><p>Photographie les plantes sans les cueillir, respecte les espaces protégés et ne consomme jamais une plante sur la base d’un scan. Les scores d’identification sont des indications, pas des garanties.</p><p className="fine">PokePlant est un projet indépendant, sans affiliation avec Pokémon. Identification : Pl@ntNet. Compte et stockage : Supabase. Le fonctionnement gratuit reste soumis aux quotas de ces services.</p></section>
    {confirm && <Modal title="Supprimer ton compte ?" onClose={() => { if (!busy) setConfirm(false); }}>
      <p>Ton compte, tes captures et tes photos seront définitivement supprimés. Cette action est irréversible. Tu peux d’abord exporter ton carnet depuis ton profil.</p>
      <form className="form-stack" onSubmit={deleteAccount}><label>Écris SUPPRIMER pour confirmer<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} pattern="SUPPRIMER" required autoComplete="off" disabled={busy} /></label>{error && <p role="alert" className="error-box">{error}</p>}<button className="button destructive" disabled={confirmation !== 'SUPPRIMER' || busy}>{busy ? 'Suppression en cours…' : 'Supprimer définitivement'}</button></form>
    </Modal>}
  </div>;
}

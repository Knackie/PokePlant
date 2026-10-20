import { useState, type FormEvent } from 'react';
import { Leaf, Mail, UserRound } from 'lucide-react';
import { Modal } from './Modal';
import { requireSupabase, supabase } from '../lib/supabase';

type AuthMode = 'login' | 'signup' | 'reset';

export function AuthModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<AuthMode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function changeMode(value: AuthMode) { setMode(value); setError(''); setMessage(''); }
  async function googleSignIn() {
    setBusy(true); setError(''); setMessage('');
    try {
      const { error } = await requireSupabase().auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'La connexion avec Google n’a pas pu démarrer.');
    } finally { setBusy(false); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      const client = requireSupabase();
      if (mode === 'signup') {
        const { data, error } = await client.auth.signUp({ email, password, options: { data: { display_name: name.trim() }, emailRedirectTo: window.location.origin } });
        if (error) throw error;
        if (data.session) onClose();
        else setMessage('Consulte ta boîte mail pour confirmer ton inscription. Si le compte existe déjà, utilise « Se connecter ».');
      } else if (mode === 'login') {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onClose();
      } else {
        const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (error) throw error;
        setMessage('Si un compte correspond à cette adresse, un lien de réinitialisation va être envoyé.');
      }
    } catch (error) {
      const raw = error instanceof Error ? error.message : 'La connexion a échoué.';
      setError(raw === 'Invalid login credentials' ? 'Adresse e-mail ou mot de passe incorrect.' : raw === 'Email not confirmed' ? 'Confirme ton adresse e-mail avant de te connecter.' : raw);
    } finally { setBusy(false); }
  }

  return <Modal title={mode === 'signup' ? 'Ton aventure commence ici' : mode === 'login' ? 'Heureux de te retrouver' : 'Retrouver ton compte'} onClose={onClose}>
    <div className="auth-emblem"><Leaf size={30} /></div>
    {!supabase ? <div className="notice"><strong>Le jardin est en préparation.</strong><p>Les comptes et les scans nécessitent la configuration Supabase. L’aperçu du jeu reste accessible, mais aucune capture n’est simulée ni sauvegardée localement.</p><p>Le propriétaire doit suivre le guide d’installation fourni avec le projet.</p></div> : <>
      <p className="muted">Un compte gratuit pour garder tes découvertes, sur tous tes appareils.</p>
      {mode !== 'reset' && <><button className="button secondary full" onClick={googleSignIn} disabled={busy}><UserRound size={18} />Continuer avec Google</button><div className="auth-separator"><span>ou avec ton e-mail</span></div></>}
      {mode !== 'reset' && <div className="segmented"><button className={mode === 'signup' ? 'selected' : ''} onClick={() => changeMode('signup')} disabled={busy}>Créer un compte</button><button className={mode === 'login' ? 'selected' : ''} onClick={() => changeMode('login')} disabled={busy}>Se connecter</button></div>}
      <form onSubmit={submit} className="form-stack">
        {mode === 'signup' && <label>Ton nom d’explorateur<input autoComplete="nickname" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={32} required placeholder="Camille" /></label>}
        <label>Adresse e-mail<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="toi@exemple.fr" /></label>
        {mode !== 'reset' && <label>Mot de passe<input type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={8} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Au moins 8 caractères" /></label>}
        {mode === 'signup' && <p className="fine">Collection et photos privées. Aucun emplacement GPS enregistré. Tu peux exporter tes découvertes et supprimer ton compte depuis ton profil.</p>}
        {error && <p role="alert" className="error-box">{error}</p>}
        {message && <p role="status" className="success-box"><Mail size={18} />{message}</p>}
        <button className="button primary full" disabled={busy}>{busy ? 'Un instant…' : mode === 'signup' ? 'Faire pousser mon aventure' : mode === 'login' ? 'Me connecter' : 'Envoyer le lien'}</button>
      </form>
      <button className="text-button full" onClick={() => changeMode(mode === 'reset' ? 'login' : 'reset')}>{mode === 'reset' ? 'Retour à la connexion' : 'Mot de passe oublié ?'}</button>
    </>}
  </Modal>;
}

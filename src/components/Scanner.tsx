import { useEffect, useRef, useState } from 'react';
import { Camera, Check, ChevronRight, ImagePlus, Leaf, LoaderCircle, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import type { Candidate, Capture } from '../types';
import { preparePhoto } from '../lib/photos';
import { functionError, requireSupabase } from '../lib/supabase';
import { isCandidate, saveCapture } from '../lib/collection';
import { speciesKey } from '../game';

export function Scanner({ user, captures, onAuth, onSaved, online }: { user: User | null; captures: Capture[]; onAuth: () => void; onSaved: () => Promise<void>; online: boolean }) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [organ, setOrgan] = useState('auto');
  const [consent, setConsent] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [phase, setPhase] = useState('');
  const camera = useRef<HTMLInputElement>(null);
  const library = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!photo) { setUrl(''); return; }
    const value = URL.createObjectURL(photo);
    setUrl(value);
    return () => URL.revokeObjectURL(value);
  }, [photo]);

  function reset() { setPhoto(null); setCandidates([]); setSelected(null); setSaved(false); setError(''); setConsent(false); }
  async function choose(file?: File) {
    if (!file) return;
    setBusy(true); setError(''); setPhase('Préparation de la photo…');
    try {
      const prepared = await preparePhoto(file);
      if (!mounted.current) return;
      setPhoto(prepared); setCandidates([]); setSelected(null); setSaved(false); setConsent(false);
    } catch (error) { if (mounted.current) setError(await functionError(error)); }
    finally { if (mounted.current) setBusy(false); }
  }
  async function scan() {
    if (!user) { onAuth(); return; }
    if (!photo || !consent) return;
    setBusy(true); setError(''); setPhase('À la recherche de ta plante…');
    try {
      const body = new FormData();
      body.append('image', photo); body.append('organ', organ);
      const { data, error } = await requireSupabase().functions.invoke('identify-plant', { body });
      if (error) throw error;
      if (!data || !Array.isArray(data.candidates) || !data.candidates.length || !data.candidates.every(isCandidate)) throw new Error('Le service n’a pas renvoyé d’identification exploitable. Essaie une photo plus nette.');
      if (mounted.current) setCandidates(data.candidates);
    } catch (error) { if (mounted.current) setError(await functionError(error)); }
    finally { if (mounted.current) setBusy(false); }
  }
  async function save() {
    if (!user || !selected || !photo) return;
    setBusy(true); setError(''); setPhase('Enregistrement dans ton Plantédex…');
    try {
      await saveCapture(user.id, selected, photo);
      if (mounted.current) setSaved(true);
      await onSaved();
    } catch (error) { if (mounted.current) setError(await functionError(error)); }
    finally { if (mounted.current) setBusy(false); }
  }
  const duplicate = selected && captures.some((capture) => speciesKey(capture.scientific_name) === speciesKey(selected.scientificName));

  return <div className="scanner-layout">
    <section className="scan-card panel">
      <div className="eyebrow"><Camera size={15} /> LE SCANNER BOTANIQUE</div>
      <h2>{saved ? 'Une nouvelle rencontre !' : 'Une photo. Une découverte.'}</h2>
      <p className="muted">Approche-toi, cadre une seule plante et laisse la nature te surprendre.</p>
      <input ref={camera} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" aria-label="Photographier une plante" disabled={busy || saved} onChange={(event) => { void choose(event.target.files?.[0]); event.target.value = ''; }} />
      <input ref={library} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Importer une photo de plante" disabled={busy || saved} onChange={(event) => { void choose(event.target.files?.[0]); event.target.value = ''; }} />
      {url ? <div className="photo-preview"><img src={url} alt="La plante à identifier" /><span><Leaf size={15} /> Ta rencontre du jour</span></div> : <div className="camera-placeholder"><div className="focus-corners"><Camera size={46} strokeWidth={1.1} /></div><strong>Qu’est-ce qui pousse par ici ?</strong><p>Une feuille, une fleur, une nouvelle aventure.</p></div>}
      {!saved && <div className="photo-actions"><button className="button primary" onClick={() => camera.current?.click()} disabled={busy}><Camera size={18} />{photo ? 'Reprendre' : 'Prendre une photo'}</button><button className="button secondary" onClick={() => library.current?.click()} disabled={busy}><ImagePlus size={18} />Importer</button></div>}
      {photo && !candidates.length && !saved && <div className="form-stack scan-form">
        <label>Que voit-on sur la photo ?<select value={organ} onChange={(event) => setOrgan(event.target.value)} disabled={busy}><option value="auto">Laisser le scanner choisir</option><option value="leaf">Une feuille</option><option value="flower">Une fleur</option><option value="fruit">Un fruit</option><option value="bark">De l’écorce</option></select></label>
        <label className="checkbox-label"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} disabled={busy} /><span>J’accepte d’envoyer cette photo à Pl@ntNet pour l’identifier. Je n’inclus ni visage ni information personnelle.</span></label>
        <button className="button primary full" onClick={scan} disabled={busy || !consent || !online}><Sparkles size={18} />{user ? 'Identifier ma plante' : 'Me connecter pour identifier'}</button>
      </div>}
      {busy && <p role="status" className="busy-line"><LoaderCircle size={18} className="spin" />{phase}</p>}
      {error && <p role="alert" className="error-box">{error}</p>}
      {saved && <div className="capture-success"><div className="success-circle"><Check size={30} /></div><h3>{selected?.commonName || selected?.scientificName} rejoint ton Plantédex</h3><span className="xp-chip">+100 XP · Nouvelle espèce</span><p>Un petit pas pour toi, une nouvelle feuille dans ton carnet.</p><button className="button primary" onClick={reset}><RefreshCw size={17} />Une autre découverte</button></div>}
    </section>
    <aside className="scan-aside">
      {candidates.length > 0 && !saved ? <section className="panel candidates"><div className="eyebrow">À TOI DE CONFIRMER</div><h3>On dirait bien…</h3><p className="muted">Ces suggestions peuvent se tromper. Compare les noms et confirme uniquement si la proposition te paraît juste.</p>
        {candidates.map((candidate) => <button key={candidate.scientificName} className={`candidate ${selected?.scientificName === candidate.scientificName ? 'active' : ''}`} onClick={() => setSelected(candidate)} disabled={busy}><span className="candidate-icon"><Leaf size={22} /></span><span><strong>{candidate.commonName || candidate.scientificName}</strong><i>{candidate.scientificName}</i><small>{candidate.family}</small></span><span className="score">{Math.round(candidate.score * 100)} %</span></button>)}
        {selected && selected.score < 0.5 && <p className="notice">Score faible : essaie plutôt une autre photo, bien éclairée et plus proche.</p>}
        {duplicate && <p className="notice">Tu as déjà découvert cette espèce. Chaque espèce ne rapporte de l’XP qu’une fois.</p>}
        <button className="button primary full" disabled={!selected || busy || !!duplicate || !online} onClick={save}>Confirmer et capturer <ChevronRight size={17} /></button>
        <button className="text-button full" onClick={reset} disabled={busy}>Aucune ne correspond : reprendre une photo</button>
      </section> : <section className="panel tips"><span className="tip-icon"><Leaf size={24} /></span><h3>Le secret d’une belle capture</h3><ol><li><strong>Une seule plante</strong><p>Une feuille ou une fleur bien visible, sans la cueillir.</p></li><li><strong>La bonne lumière</strong><p>Évite les ombres fortes et les photos floues.</p></li><li><strong>Un peu de curiosité</strong><p>Regarde les suggestions et choisis celle qui correspond.</p></li></ol></section>}
      <div className="privacy-note"><ShieldCheck size={22} /><p>Ta collection est privée. Les métadonnées de la photo sont retirées avant l’envoi. Aucun GPS collecté.</p></div>
      <p className="fine">Identification propulsée par <a href="https://plantnet.org/" target="_blank" rel="noreferrer">Pl@ntNet</a>. 20 essais par compte et par jour, dans la limite du quota partagé du site. Une identification n’est jamais une preuve de comestibilité ni un conseil médical.</p>
    </aside>
  </div>;
}

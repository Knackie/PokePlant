import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ArrowDownToLine, ArrowRight, Award, BookOpen, Camera, Check, ChevronRight, Compass, Flower2, Leaf, LockKeyhole, Map, Search, ShieldCheck, Sparkles, Sprout, TreePine, Trophy, UserRound, WifiOff } from 'lucide-react';
import { catalog } from './data';
import { badges, progression, searchMatches, speciesKey, XP_PER_LEVEL } from './game';
import type { Capture, CatalogPlant } from './types';
import { supabase, functionError, requireSupabase } from './lib/supabase';
import { loadCollection } from './lib/collection';
import { PlantArt } from './components/PlantArt';
import { AuthModal } from './components/AuthModal';
import { Modal } from './components/Modal';
import { Install } from './components/Install';
import { Scanner } from './components/Scanner';
import { Profile } from './components/Profile';
import { explorerName } from './lib/account';

type Tab = 'home' | 'dex' | 'scan' | 'badges' | 'profile';
const navigation = [
  { id: 'home', label: 'Mon aventure', icon: Compass },
  { id: 'dex', label: 'Plantédex', icon: BookOpen },
  { id: 'scan', label: 'Scanner', icon: Camera },
  { id: 'badges', label: 'Mes badges', icon: Award },
  { id: 'profile', label: 'Mon profil', icon: UserRound },
] as const;
const badgeIcons = { sprout: Sprout, leaf: Leaf, compass: Compass, flower: Flower2, tree: TreePine, award: Award };

export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(!!supabase);
  const [collection, setCollection] = useState<{ owner: string; captures: Capture[] } | null>(null);
  const [collectionLoading, setCollectionLoading] = useState(false);
  const [collectionError, setCollectionError] = useState('');
  const [authError, setAuthError] = useState('');
  const [authOpen, setAuthOpen] = useState(false);
  const [detail, setDetail] = useState<CatalogPlant | Capture | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [recovery, setRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [notice, setNotice] = useState('');
  const userId = session?.user.id;
  const captures = collection?.owner === userId && collection ? collection.captures : [];
  const currentUser = useRef(userId);
  currentUser.current = userId;
  const requestId = useRef(0);
  const stats = progression(captures);
  const achievements = badges(captures);
  const earned = achievements.filter((badge) => badge.current >= badge.target).length;
  const firstName = explorerName(session?.user).split(' ')[0];

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let alive = true;
    let receivedEvent = false;
    const { data: { subscription } } = client.auth.onAuthStateChange((event, value) => {
      receivedEvent = true;
      if (!alive) return;
      setSession(value); setAuthLoading(false);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (!value) setRecovery(false);
    });
    void client.auth.getSession().then(({ data, error }) => {
      if (!alive) return;
      if (error) setAuthError(error.message);
      if (!receivedEvent) setSession(data.session);
      setAuthLoading(false);
    }).catch((error: unknown) => {
      if (alive) { setAuthError(error instanceof Error ? error.message : 'Impossible de rétablir la session.'); setAuthLoading(false); }
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const request = ++requestId.current;
    setCollectionLoading(true); setCollectionError('');
    try {
      const data = await loadCollection(userId);
      if (currentUser.current === userId && requestId.current === request) setCollection({ owner: userId, captures: data });
    } catch (error) {
      if (currentUser.current === userId && requestId.current === request) setCollectionError(await functionError(error));
    } finally {
      if (currentUser.current === userId && requestId.current === request) setCollectionLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    ++requestId.current; setCollection(null); setDetail(null); setCollectionError(''); setCollectionLoading(false);
    if (!userId) return;
    void refresh();
    const interval = setInterval(() => { void refresh(); }, 45 * 60 * 1000);
    return () => { clearInterval(interval); ++requestId.current; };
  }, [userId, refresh]);

  useEffect(() => {
    function connected() { setOnline(true); if (userId) void refresh(); }
    function disconnected() { setOnline(false); }
    window.addEventListener('online', connected); window.addEventListener('offline', disconnected);
    return () => { window.removeEventListener('online', connected); window.removeEventListener('offline', disconnected); };
  }, [refresh, userId]);

  function navigate(value: Tab) { setTab(value); setQuery(''); setFilter('all'); window.scrollTo({ top: 0, behavior: 'instant' }); }
  async function updatePassword(event: FormEvent) {
    event.preventDefault(); setPasswordBusy(true); setPasswordError('');
    try {
      const { error } = await requireSupabase().auth.updateUser({ password: newPassword });
      if (error) throw error;
      setRecovery(false); setNewPassword(''); setNotice('Ton mot de passe a été modifié.');
    } catch (error) { setPasswordError(await functionError(error)); }
    finally { setPasswordBusy(false); }
  }

  const collectedKeys = new Set(captures.map((capture) => speciesKey(capture.scientific_name)));
  const photoByKey = new globalThis.Map(captures.map((capture): [string, string | undefined] => [speciesKey(capture.scientific_name), capture.photoUrl]));
  const visibleCatalog = catalog.filter((plant) => searchMatches([plant.name, plant.scientificName, plant.family], query) && (filter === 'all' || (filter === 'collected') === collectedKeys.has(speciesKey(plant.scientificName))));
  const extraCaptures = captures.filter((capture) => !catalog.some((plant) => speciesKey(plant.scientificName) === speciesKey(capture.scientific_name)) && filter !== 'discover' && searchMatches([capture.common_name, capture.scientific_name, capture.family], query));

  return <div className="app-shell">
    <aside className="sidebar">
      <button className="brand" onClick={() => navigate('home')} aria-label="PokePlant, accueil"><span className="brand-icon"><Sprout size={25} /></span><span>Poke<span className="brand-light">Plant</span><small>LA NATURE À COLLECTIONNER</small></span></button>
      <div className="sidebar-divider" />
      <span className="nav-caption">TON TERRAIN DE JEU</span>
      <nav className="desktop-nav" aria-label="Navigation principale">{navigation.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${tab === id ? 'active' : ''}`} aria-current={tab === id ? 'page' : undefined} onClick={() => navigate(id)}><Icon size={20} strokeWidth={1.7} /><span>{label}</span>{id === 'scan' && <span className="nav-plus">+</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="nature-note"><Sprout size={26} /><p>Le monde est un jardin.<br /><strong>À toi de l’explorer.</strong></p><span>PRENDS LE TEMPS DE REGARDER</span></div><Install /><button className="sidebar-user" onClick={() => session ? navigate('profile') : setAuthOpen(true)}><span className="avatar">{session ? firstName.slice(0, 1).toUpperCase() : <UserRound size={19} />}</span><span><strong>{session ? firstName : 'À toi de jouer'}</strong><small>{session ? `Explorateur · Niv. ${stats.level}` : 'Créer mon compte gratuit'}</small></span><ChevronRight size={16} /></button></div>
    </aside>

    <div className="main-shell">
      <header className="topbar"><div className="breadcrumb"><span>PokePlant</span><ChevronRight size={13} /><strong>{navigation.find((item) => item.id === tab)?.label}</strong></div><span className="topbar-motto"><span className="status-dot" /> Une aventure qui prend racine</span><button className="mobile-brand" onClick={() => navigate('home')}><Sprout size={23} />PokePlant</button><div className="mobile-install"><Install /></div><button className="top-user" onClick={() => session ? navigate('profile') : setAuthOpen(true)}><span className="xp-top"><Sparkles size={14} />{stats.xp} XP</span><span className="avatar small">{session ? firstName.slice(0, 1).toUpperCase() : <UserRound size={17} />}</span></button></header>
      <main>
        {!online && <div className="notice offline" role="status"><WifiOff size={18} />Tu es hors ligne. Le carnet ouvert reste visible, mais le scan, les comptes et la sauvegarde nécessitent Internet.</div>}
        {authError && <p className="error-box" role="alert">Connexion : {authError}</p>}
        {notice && <div className="success-box" role="status">{notice}<button className="text-button" onClick={() => setNotice('')}>Fermer</button></div>}
        {collectionError && <div className="error-box" role="alert">Impossible de charger toute ta collection : {collectionError} <button className="text-button" onClick={() => void refresh()}>Réessayer</button></div>}
        {(authLoading || collectionLoading) && <p className="loading-status" role="status">Ouverture de ton carnet…</p>}
        {tab === 'home' && <>
          <div className="page-heading"><div><div className="eyebrow">UN PEU DE NATURE, BEAUCOUP DE DÉCOUVERTES</div><h1>Ton aventure prend racine<span className="heading-dot">.</span></h1><p>Bienvenue {session ? firstName : 'dans ton nouveau terrain de jeu'}. Le prochain trésor est peut-être juste à tes pieds.</p></div><span className="edition-tag"><Leaf size={14} /> CARNET D’EXPLORATEUR</span></div>
          <section className="hero">
            <div className="hero-copy"><span className="hero-tag"><span /> LE MONDE VÉGÉTAL T’ATTEND</span><h2>Attrape l’instant.<br />Collectionne<br /><em>le vivant.</em></h2><p>Une plante croisée, une photo prise, une nouvelle espèce dans ton Plantédex. L’aventure commence dehors.</p><button className="button lime" onClick={() => navigate('scan')}><Camera size={19} />Scanner une plante<ArrowRight size={18} /></button><span className="hero-footnote"><ShieldCheck size={14} /> Gratuit · Curieux par nature</span></div>
            <div className="hero-art"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><span className="art-cross cross-one">+</span><span className="art-cross cross-two">+</span><div className="hero-plant-card"><div className="art-card-top"><span>SPÉCIMEN N° 001</span><Leaf size={16} /></div><PlantArt shape="split" color="#3b714d" /><div className="art-card-bottom"><span>Monstera deliciosa<small>À découvrir près de toi</small></span><span className="art-stamp"><Sprout size={21} /></span></div></div><div className="floating-label label-top"><span className="round-lime"><Check size={15} /></span>Chaque plante a son histoire.</div><div className="floating-label label-bottom"><Sparkles size={17} /><span>Ta première découverte<strong>+100 XP à la clé</strong></span></div><span className="art-caption">OBSERVE. DÉCOUVRE. ÉMERVEILLE-TOI.</span></div>
          </section>
          <section className="stats-grid" aria-label="Ta progression"><div className="stat-card"><span className="stat-icon sage"><BookOpen size={22} /></span><div><strong>{stats.species}<small>espèce{stats.species !== 1 ? 's' : ''}</small></strong><span>Dans ton Plantédex</span></div><span className="stat-detail">Chaque rencontre compte</span></div><div className="stat-card"><span className="stat-icon sand"><Trophy size={22} /></span><div><strong>{earned}<small>/ {achievements.length}</small></strong><span>Badges débloqués</span></div><button className="stat-link" onClick={() => navigate('badges')} aria-label="Voir mes badges"><ArrowRight size={17} /></button></div><div className="stat-card level-card"><span className="stat-icon lavender"><Sprout size={23} /></span><div className="level-body"><div className="level-row"><strong>Niveau {stats.level}</strong><span>{stats.levelXp} / {XP_PER_LEVEL} XP</span></div><progress max={XP_PER_LEVEL} value={stats.levelXp} aria-label="Progression vers le niveau suivant" /><span>Encore {stats.remaining} XP pour grandir</span></div></div></section>
          <div className="home-lower"><section className="discover-section"><div className="section-heading"><div><div className="eyebrow">IL Y A TANT À DÉCOUVRIR</div><h2>De futures rencontres</h2></div><button className="text-button" onClick={() => navigate('dex')}>Ouvrir le Plantédex<ArrowRight size={16} /></button></div><div className="preview-grid">{catalog.slice(0, 3).map((plant) => <PlantCard key={plant.id} plant={plant} collected={collectedKeys.has(speciesKey(plant.scientificName))} photoUrl={photoByKey.get(speciesKey(plant.scientificName))} onClick={() => setDetail(plant)} />)}</div></section><section className="daily-tip"><span className="eyebrow"><Sparkles size={14} /> LA PAUSE NATURE</span><span className="tip-quotation">«</span><h3>Pas besoin d’aller loin<br />pour s’émerveiller.</h3><p>Un balcon, un parc, le bord d’un chemin… Regarde autour de toi : ton aventure est déjà là.</p><div className="tip-bottom"><Leaf size={18} /><span>Photographie sans cueillir.</span></div></section></div>
          {!session && <section className="join-strip"><span className="join-icon"><Map size={26} /></span><div><h3>Un carnet rien qu’à toi.</h3><p>Crée ton compte pour sauvegarder tes plantes et faire grandir ta collection.</p></div><button className="button secondary" onClick={() => setAuthOpen(true)}>Commencer gratuitement<ArrowRight size={16} /></button></section>}
        </>}

        {tab === 'dex' && <>
          <PageHeading eyebrow="LES PETITES MERVEILLES DU QUOTIDIEN" title="Ton Plantédex" text="Un carnet vivant, une histoire derrière chaque feuille. Les 8 fiches de départ ne sont qu’un début : toute espèce reconnue peut rejoindre ta collection." />
          <div className="dex-toolbar"><div className="segmented"><button className={filter === 'all' ? 'selected' : ''} onClick={() => setFilter('all')}>Tout explorer</button><button className={filter === 'collected' ? 'selected' : ''} onClick={() => setFilter('collected')}>Mes captures ({stats.species})</button><button className={filter === 'discover' ? 'selected' : ''} onClick={() => setFilter('discover')}>À découvrir</button></div><label className="search-field"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Un nom, une famille…" aria-label="Rechercher une plante" /></label></div>
          {(visibleCatalog.length + extraCaptures.length) > 0 ? <div className="dex-grid">{visibleCatalog.map((plant) => <PlantCard key={plant.id} plant={plant} collected={collectedKeys.has(speciesKey(plant.scientificName))} photoUrl={photoByKey.get(speciesKey(plant.scientificName))} onClick={() => setDetail(plant)} />)}{extraCaptures.map((capture) => <CaptureCard key={capture.id} capture={capture} onClick={() => setDetail(capture)} />)}</div> : <EmptyState icon="leaf" title={filter === 'collected' && !query ? 'Ton carnet attend sa première feuille' : 'Aucune plante par ici'} text={filter === 'collected' ? 'Scanne ta première plante et confirme son identification pour commencer ta collection.' : 'Essaie un autre nom ou change de filtre.'} onClick={() => navigate('scan')} button="Scanner une plante" />}
          <div className="catalog-note"><Leaf size={18} /><p>Les illustrations sont des dessins originaux, pas des références d’identification. Les fiches botaniques sont accessibles à tous ; seules tes captures comptent pour ta progression.</p></div>
        </>}
        {tab === 'scan' && <><PageHeading eyebrow="UNE NOUVELLE RENCONTRE T’ATTEND" title="Ouvre l’œil. Vise une feuille" text="Ton appareil photo est la porte d’entrée vers un monde que tu ne regarderas plus de la même façon." /><Scanner key={userId || 'guest'} user={session?.user ?? null} captures={captures} onAuth={() => setAuthOpen(true)} onSaved={refresh} online={online} /></>}
        {tab === 'badges' && <><PageHeading eyebrow="CHAQUE DÉCOUVERTE TE FAIT GRANDIR" title="Les petites grandes victoires" text="Pas de course contre la montre. Des étapes à franchir, à ton rythme, et la fierté de voir ton jardin grandir." /><section className="badge-summary panel"><span className="stat-icon sand"><Trophy size={28} /></span><div><h3>{earned} badge{earned !== 1 ? 's' : ''} sur {achievements.length} débloqué{earned !== 1 ? 's' : ''}</h3><p>Les badges se gagnent en découvrant des espèces et des familles différentes.</p></div><span className="level-pill">Niveau {stats.level}</span></section><div className="badges-grid">{achievements.map((badge) => { const Icon = badgeIcons[badge.icon]; const unlocked = badge.current >= badge.target; return <article key={badge.id} className={`panel badge-card ${unlocked ? 'unlocked' : ''}`}><span className="badge-state">{unlocked ? <><Check size={13} />Débloqué</> : <><LockKeyhole size={12} />À cultiver</>}</span><div className="badge-medal"><Icon size={34} strokeWidth={1.4} /></div><h3>{badge.name}</h3><p>{badge.description}</p><progress max={badge.target} value={Math.min(badge.current, badge.target)} aria-label={`Progression ${badge.name}`} /><span className="fine">{Math.min(badge.current, badge.target)} / {badge.target}</span></article>; })}</div></>}
        {tab === 'profile' && <><PageHeading eyebrow="L’EXPLORATEUR DERRIÈRE LE CARNET" title="Ton petit coin de nature" text="Retrouve ta progression et garde la main sur tes données." /><Profile user={session?.user ?? null} captures={captures} onAuth={() => setAuthOpen(true)} /></>}
        {!supabase && <div className="setup-banner"><span><Sprout size={18} /><strong>Aperçu du jardin</strong> · Les comptes et le scan seront disponibles après configuration de Supabase et Pl@ntNet.</span><button className="text-button" onClick={() => setAuthOpen(true)}>En savoir plus<ArrowRight size={14} /></button></div>}
        <footer><span><Sprout size={15} /> PokePlant · Cultive ta curiosité.</span><button className="text-button" onClick={() => navigate('profile')}>Respect de la nature & données</button><span>Fait pour explorer, pas pour cueillir.</span></footer>
      </main>
    </div>
    <nav className="mobile-nav" aria-label="Navigation mobile">{navigation.map(({ id, label, icon: Icon }) => <button key={id} className={tab === id ? 'active' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => navigate(id)}><Icon size={21} /><span>{label}</span></button>)}</nav>
    {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    {detail && <Modal title={'scientificName' in detail ? detail.name : detail.common_name || detail.scientific_name} onClose={() => setDetail(null)}>
      {'scientificName' in detail ? <>{collectedKeys.has(speciesKey(detail.scientificName)) && photoByKey.get(speciesKey(detail.scientificName)) ? <img className="detail-photo" src={photoByKey.get(speciesKey(detail.scientificName))} alt={detail.name} /> : <div className="detail-art"><PlantArt shape={detail.shape} color={detail.color} /></div>}<div className="detail-status">{collectedKeys.has(speciesKey(detail.scientificName)) ? <><Check size={15} />Espèce capturée</> : <><Compass size={15} />Une future rencontre</>}</div><p className="latin">{detail.scientificName}</p><div className="detail-info"><span>Famille<strong>{detail.family}</strong></span><span>Habitat<strong>{detail.habitat}</strong></span></div><p>{detail.description}</p><button className="button primary full" onClick={() => { setDetail(null); navigate('scan'); }}><Camera size={17} />Partir à sa rencontre</button></> : <>{detail.photoUrl && <img className="detail-photo" src={detail.photoUrl} alt={detail.common_name || detail.scientific_name} />}<p className="latin">{detail.scientific_name}</p><div className="detail-info"><span>Famille<strong>{detail.family}</strong></span><span>Rencontrée le<strong>{new Date(detail.created_at).toLocaleDateString('fr-FR')}</strong></span></div><p className="success-box"><Check size={17} />Dans ton Plantédex · +100 XP</p><p className="fine">Proposition Pl@ntNet confirmée par toi. Score indicatif : {Math.round(detail.score * 100)} %. Une identification peut être erronée.</p></>}
      <p className="fine warning-note">Ne mange jamais une plante sur la base d’une photo ou d’une identification automatique.</p>
    </Modal>}
    {recovery && <Modal title="Choisir un nouveau mot de passe" onClose={() => { if (!passwordBusy) setRecovery(false); }}><form className="form-stack" onSubmit={updatePassword}><label>Nouveau mot de passe<input type="password" autoComplete="new-password" minLength={8} maxLength={128} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></label>{passwordError && <p className="error-box" role="alert">{passwordError}</p>}<button className="button primary" disabled={passwordBusy}>{passwordBusy ? 'Enregistrement…' : 'Enregistrer le mot de passe'}</button></form></Modal>}
  </div>;
}

function PageHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return <div className="page-heading secondary-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}<span className="heading-dot">.</span></h1><p>{text}</p></div></div>;
}
function PlantCard({ plant, collected, photoUrl, onClick }: { plant: CatalogPlant; collected: boolean; photoUrl?: string; onClick: () => void }) {
  return <button className={`plant-card ${collected ? 'collected' : ''}`} onClick={onClick}><div className="plant-card-art"><span className="plant-number">N° {plant.id.padStart(3, '0')}</span><span className={`plant-status ${collected ? 'captured' : ''}`} aria-label={collected ? 'Capturée' : 'À découvrir'}>{collected ? <Check size={14} /> : <Compass size={14} />}</span>{collected && photoUrl ? <img src={photoUrl} alt={plant.name} loading="lazy" /> : <PlantArt shape={plant.shape} color={plant.color} />}</div><div className="plant-card-info"><span className="plant-family">{plant.family}</span><h3>{plant.name}</h3><p>{plant.scientificName}</p><div className="card-bottom"><span>{collected ? 'Dans ton carnet' : 'À découvrir'}</span><ArrowRight size={15} /></div></div></button>;
}
function CaptureCard({ capture, onClick }: { capture: Capture; onClick: () => void }) {
  return <button className="plant-card collected" onClick={onClick}><div className="plant-card-art capture-art">{capture.photoUrl ? <img src={capture.photoUrl} alt={capture.common_name} loading="lazy" /> : <PlantArt />}<span className="plant-status captured"><Check size={14} /></span></div><div className="plant-card-info"><span className="plant-family">{capture.family}</span><h3>{capture.common_name || capture.scientific_name}</h3><p>{capture.scientific_name}</p><div className="card-bottom"><span>Dans ton carnet</span><ArrowRight size={15} /></div></div></button>;
}
function EmptyState({ title, text, onClick, button }: { icon: string; title: string; text: string; onClick: () => void; button: string }) {
  return <div className="empty-state panel"><Sprout size={48} strokeWidth={1.2} /><h2>{title}</h2><p>{text}</p><button className="button primary" onClick={onClick}>{button}<ArrowDownToLine size={17} /></button></div>;
}

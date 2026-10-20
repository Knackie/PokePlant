import { useEffect, useState } from 'react';
import { Download, Share, Smartphone } from 'lucide-react';
import { Modal } from './Modal';

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function Install() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [help, setHelp] = useState(false);
  const [installed, setInstalled] = useState(window.matchMedia('(display-mode: standalone)').matches);
  const [error, setError] = useState('');
  useEffect(() => {
    function capture(event: Event) { event.preventDefault(); setEvent(event as InstallEvent); }
    function done() { setInstalled(true); setEvent(null); }
    window.addEventListener('beforeinstallprompt', capture);
    window.addEventListener('appinstalled', done);
    return () => { window.removeEventListener('beforeinstallprompt', capture); window.removeEventListener('appinstalled', done); };
  }, []);
  async function install() {
    if (!event) { setHelp(true); return; }
    try {
      await event.prompt();
      await event.userChoice;
      setEvent(null);
    } catch { setError('L’installation n’a pas pu démarrer. Utilise le menu de ton navigateur.'); setHelp(true); }
  }
  return <>
    <button className="install-button" onClick={install} disabled={installed} aria-label={installed ? 'Appli installée' : 'Installer l’appli'}><Download size={17} /><span>{installed ? 'Appli installée' : 'Installer l’appli'}</span></button>
    {help && <Modal title="Ton petit coin de nature, partout" onClose={() => setHelp(false)}>
      <div className="auth-emblem"><Smartphone size={30} /></div>
      <p>Pas de boutique d’applications, pas de téléchargement payant. PokePlant s’installe depuis ton navigateur.</p>
      <div className="install-step"><Share size={23} /><div><strong>Sur iPhone ou iPad</strong><p>Ouvre le site dans Safari, touche Partager, puis « Sur l’écran d’accueil » et « Ajouter ».</p></div></div>
      <div className="install-step"><Download size={23} /><div><strong>Sur Android ou ordinateur</strong><p>Ouvre le menu de Chrome ou Edge, puis « Installer l’application » ou « Ajouter à l’écran d’accueil ».</p></div></div>
      <p className="fine">L’installation nécessite le site servi en HTTPS (ou localhost pour le développement). Le scan et la sauvegarde demandent Internet.</p>
      {error && <p role="alert" className="error-box">{error}</p>}
    </Modal>}
  </>;
}

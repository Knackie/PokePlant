import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { useRegisterSW } from 'virtual:pwa-register/react';
import App from './App';
import './styles.css';

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('PokePlant rendering error', error, info.componentStack); }
  render() {
    if (this.state.failed) return <main className="fatal-error"><h1>Une branche s’est cassée.</h1><p>Le jeu n’a pas pu s’afficher. Recharge la page pour rouvrir ton carnet.</p><button className="button primary" onClick={() => window.location.reload()}>Recharger</button></main>;
    return this.props.children;
  }
}

function ServiceWorkerNotice() {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW({
    onRegisterError(error: Error) { console.error('PokePlant offline registration failed', error); },
  });
  if (!needRefresh) return null;
  return <div className="update-toast" role="status"><span>Une nouvelle pousse est disponible !</span><button onClick={() => void updateServiceWorker(true)}>Mettre à jour</button><button onClick={() => setNeedRefresh(false)}>Plus tard</button></div>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><ErrorBoundary><App /><ServiceWorkerNotice /></ErrorBoundary></StrictMode>);

import { lazy, Suspense, type ReactNode } from 'react';
import { Icon, Skeleton } from './components/ui';
import { href, useRoute } from './lib/router';
import { useStore } from './lib/store';
import { AuthPage } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { LessonPage } from './pages/Lesson';
import { LegalPage } from './pages/Legal';
import { ModulePage, ModulesPage } from './pages/Modules';
import { Onboarding } from './pages/Onboarding';
import { PremiumPage, PremiumReturn } from './pages/Premium';
import { ProfilePage } from './pages/Profile';
import { ProgressPage } from './pages/Progress';
import { ReviewPage } from './pages/Review';
import { Welcome } from './pages/Welcome';

const AdminPage = lazy(() => import('./pages/Admin'));

const NAV: [string, string, string][] = [
  ['/', 'home', 'Accueil'],
  ['/apprendre', 'book', 'Apprendre'],
  ['/revisions', 'refresh', 'Révisions'],
  ['/progression', 'chart', 'Progression'],
  ['/profil', 'user', 'Profil'],
];

function Nav({ path }: { path: string }) {
  const { isAdmin } = useStore();
  const active = (p: string) => (p === '/' ? path === '/' : path.startsWith(p));
  return (
    <nav className="nav" aria-label="Navigation principale">
      <span className="brand">Arabe du Coran</span>
      {NAV.map(([p, icon, label]) => (
        <a key={p} href={href(p)} aria-current={active(p) ? 'page' : undefined}>
          <Icon name={icon} />
          <span>{label}</span>
        </a>
      ))}
      {isAdmin && (
        <a href={href('/admin')} aria-current={path.startsWith('/admin') ? 'page' : undefined}>
          <Icon name="shield" />
          <span>Admin</span>
        </a>
      )}
    </nav>
  );
}

function Shell({ path, children, wide }: { path: string; children: ReactNode; wide?: boolean }) {
  const { online, pendingSync, syncError, toast, syncNow, userId } = useStore();
  return (
    <div className="app">
      <a href="#contenu" className="sr-only">Aller au contenu</a>
      <Nav path={path} />
      <main id="contenu" className={`main${wide ? ' wide' : ''}`}>
        {!online && <div className="banner offline" role="status">Hors ligne : vos réponses seront synchronisées au retour de la connexion.</div>}
        {online && userId && syncError && (
          <div className="banner offline" role="status">
            {syncError} {pendingSync > 0 && <button type="button" className="btn ghost" onClick={() => syncNow()}>Réessayer</button>}
          </div>
        )}
        {children}
      </main>
      {toast && <div className="toast" role="status" aria-live="polite">{toast}</div>}
    </div>
  );
}

export function App() {
  const route = useRoute();
  const { ready, settings } = useStore();
  const [a, b] = route.parts;
  if (!ready) return <main className="main"><Skeleton /></main>;

  let page: ReactNode;
  let wide = false;
  switch (a) {
    case undefined: page = settings.onboarding.done ? <Dashboard /> : <Welcome />; break;
    case 'demarrage': page = <Onboarding />; break;
    case 'auth': page = <AuthPage mode={b ?? 'connexion'} next={route.query.get('next')} />; break;
    case 'apprendre': page = <ModulesPage />; break;
    case 'module': page = <ModulePage id={Number(b)} />; break;
    case 'lecon': page = <LessonPage key={b} id={b ?? ''} />; break;
    case 'revisions': page = <ReviewPage />; break;
    case 'progression': page = <ProgressPage />; break;
    case 'profil': page = <ProfilePage />; break;
    case 'premium': page = b === 'succes' || b === 'annule' ? <PremiumReturn outcome={b} /> : <PremiumPage />; break;
    case 'confidentialite':
    case 'conditions': page = <LegalPage which={a} />; break;
    case 'admin': wide = true; page = <Suspense fallback={<Skeleton />}><AdminPage tab={b} /></Suspense>; break;
    default: page = <div className="card"><h1>Page introuvable</h1><a href="#/">Revenir à l’accueil</a></div>;
  }
  return <Shell path={route.path} wide={wide}>{page}</Shell>;
}

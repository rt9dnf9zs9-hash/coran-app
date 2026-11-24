import { Card, LinkButton } from '../components/ui';
import { useStore } from '../lib/store';

export function Welcome() {
  const { catalog, userId, backend } = useStore();
  const free = catalog.filter((m) => m.tier === 'free');
  return (
    <div className="stack">
      <div className="center" style={{ padding: '1.5rem 0 .5rem' }}>
        <div className="hero-ar" lang="ar" dir="rtl" aria-hidden="true">اقْرَأْ</div>
        <h1>Apprenez à lire l’arabe du Coran, pas à pas, en français</h1>
        <p className="muted">Des leçons courtes, de l’audio, des corrections expliquées et des révisions au bon moment. Les cinq premiers modules sont gratuits, pour toujours.</p>
      </div>
      <LinkButton href="#/demarrage" variant="primary" block>Commencer</LinkButton>
      {backend && !userId && <LinkButton href="#/auth/connexion" block>Se connecter</LinkButton>}

      <h2 style={{ marginTop: '1.5rem' }}>La méthode</h2>
      <div className="grid2">
        <Card><h3>1. Les lettres</h3><p className="small muted" style={{ margin: 0 }}>Reconnaître et prononcer les 28 lettres et leurs formes.</p></Card>
        <Card><h3>2. La lecture</h3><p className="small muted" style={{ margin: 0 }}>Voyelles, signes, syllabes, puis des mots entiers.</p></Card>
        <Card><h3>3. La compréhension</h3><p className="small muted" style={{ margin: 0 }}>Vocabulaire du Coran, racines, puis grammaire (Premium).</p></Card>
      </div>

      <h2 style={{ marginTop: '1.5rem' }}>Le parcours gratuit</h2>
      <ol className="stack" style={{ paddingInlineStart: '1.2rem' }}>
        {free.map((m) => (
          <li key={m.id}><strong>{m.title}</strong> <span className="muted small">— {m.subtitle}</span></li>
        ))}
      </ol>
      <p className="small muted">Pas de publicité. Vos données servent uniquement à sauvegarder votre progression. <a href="#/confidentialite">Confidentialité</a></p>
    </div>
  );
}

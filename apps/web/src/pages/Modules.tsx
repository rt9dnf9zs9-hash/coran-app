import { isCompleted, moduleState, type ModuleState } from '@coran/core';
import { Card, Icon, LinkButton, ProgressBar } from '../components/ui';
import type { ModuleMeta } from '../lib/content';
import { useStore } from '../lib/store';

const STATE_LABEL: Record<ModuleState, string> = {
  completed: 'Terminé',
  in_progress: 'En cours',
  available: 'Disponible',
  recommended_later: 'Conseillé ensuite',
  premium_locked: 'Premium',
  premium_unlocked: 'Inclus dans votre abonnement',
};

function asModule(m: ModuleMeta) {
  return { ...m, lessons: m.lessons.map((l) => ({ ...l, steps: [], exercises: [], summary: [] })) };
}

export function ModulesPage() {
  const { catalog, progress, entitlement } = useStore();
  return (
    <div className="stack">
      <h1>Votre parcours</h1>
      <div className="path stack">
        {catalog.map((m, i) => {
          const state = moduleState(asModule(m), catalog[i - 1] && asModule(catalog[i - 1]!), progress, entitlement.premium);
          const done = m.lessons.filter((l) => isCompleted(progress[l.id])).length;
          const cls = state === 'completed' ? 'done' : state === 'in_progress' ? 'current' : m.tier === 'premium' ? 'premium' : '';
          return (
            <div key={m.id}>
              {m.tier === 'premium' && catalog[i - 1]?.tier === 'free' && <div className="divider">Fin du parcours gratuit</div>}
              <a href={`#/module/${m.id}`} className={`node ${cls}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <span className="dot" aria-hidden="true">{state === 'completed' ? <Icon name="check" size={20} /> : state === 'premium_locked' ? <Icon name="crown" size={20} /> : m.id}</span>
                <Card className="grow">
                  <div className="spread"><strong>Module {m.id} · {m.title}</strong><span className={`badge ${m.tier === 'premium' ? 'gold' : state === 'available' || state === 'recommended_later' ? 'gray' : ''}`}>{STATE_LABEL[state]}</span></div>
                  <p className="small muted" style={{ margin: '.2rem 0 .5rem' }}>{m.subtitle}</p>
                  <ProgressBar value={m.lessons.length ? done / m.lessons.length : 0} label={`Progression du module ${m.id}`} />
                  <p className="small muted" style={{ margin: '.3rem 0 0' }}>{done} / {m.lessons.length} leçons</p>
                </Card>
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ModulePage({ id }: { id: number }) {
  const { catalog, progress, entitlement } = useStore();
  const m = catalog.find((x) => x.id === id);
  if (!m) return <Card><p>Module introuvable.</p><a href="#/apprendre">Retour au parcours</a></Card>;
  const locked = m.tier === 'premium' && !entitlement.premium;
  return (
    <div className="stack">
      <a href="#/apprendre" className="small">← Parcours</a>
      <h1>Module {m.id} · {m.title}</h1>
      <p className="muted">{m.subtitle}</p>
      {locked && (
        <Card tone="gold">
          <p style={{ margin: 0 }}>Ce module fait partie de l’offre Premium. Vous pouvez consulter son programme ci-dessous.</p>
          <div style={{ marginTop: '.75rem' }}><LinkButton href="#/premium" variant="primary">Voir l’offre Premium</LinkButton></div>
        </Card>
      )}
      <ol className="stack" style={{ listStyle: 'none', padding: 0 }}>
        {m.lessons.map((l) => {
          const p = progress[l.id];
          const status = isCompleted(p) ? (p?.status === 'to_review' ? 'À revoir' : `Acquis · ${Math.round((p?.bestScore ?? 0) * 100)} %`) : p ? 'Commencée' : '';
          return (
            <li key={l.id}>
              <a href={`#/lecon/${l.id}`} className="card" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
                <div className="spread">
                  <strong>{l.kind === 'lesson' ? `${l.position}. ` : ''}{l.title}</strong>
                  {locked ? <Icon name="lock" size={18} label="Premium" /> : status && <span className="badge">{status}</span>}
                </div>
                <p className="small muted" style={{ margin: '.2rem 0 0' }}>{l.objective} · {l.estMinutes} min</p>
              </a>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

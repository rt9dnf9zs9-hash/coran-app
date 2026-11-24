import { dueQueue, isCompleted, LETTER_BY_ID, type Module } from '@coran/core';
import { Card, Icon, LinkButton, ProgressBar } from '../components/ui';
import type { ModuleMeta } from '../lib/content';
import { streakOf, useStore } from '../lib/store';

export function levelName(completedFree: number, total: number): string {
  const r = total ? completedFree / total : 0;
  if (r === 0) return 'Premiers pas';
  if (r < 0.3) return 'Découverte des lettres';
  if (r < 0.6) return 'Lecteur débutant';
  if (r < 1) return 'Lecteur en progrès';
  return 'Lecteur autonome';
}

export function nextLessonOf(catalog: ModuleMeta[], progress: ReturnType<typeof useStore>['progress'], premium: boolean, startModule = 1) {
  for (const m of catalog) {
    if (m.tier === 'premium' && !premium) continue;
    if (m.id < startModule && !m.lessons.some((l) => progress[l.id])) continue;
    for (const l of m.lessons) if (!isCompleted(progress[l.id])) return { module: m, lesson: l };
  }
  return null;
}

export function reviewLabel(key: string): string {
  const [kind, id] = key.split(':');
  if (kind === 'letter') return LETTER_BY_ID[id ?? '']?.ar ?? key;
  if (kind === 'word') return id ?? key;
  if (kind === 'haraka') return ({ a: 'fatḥa', i: 'kasra', u: 'ḍamma', sukun: 'sukūn', shadda: 'shadda', tanwin: 'tanwīn' } as Record<string, string>)[id ?? ''] ?? key;
  return key.replace(/^[a-z]+:/, '');
}

export function Dashboard() {
  const { catalog, progress, cards, studyDays, settings, entitlement, userId, backend } = useStore();
  const freeLessons = catalog.filter((m) => m.tier === 'free').flatMap((m) => m.lessons);
  const doneFree = freeLessons.filter((l) => isCompleted(progress[l.id])).length;
  const next = nextLessonOf(catalog, progress, entitlement.premium, settings.onboarding.startModule ?? 1);
  const due = dueQueue(cards);
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayMin = Math.round((studyDays[todayKey] ?? 0) / 60);
  const weekMin = Math.round(Object.entries(studyDays).filter(([d]) => d >= new Date(Date.now() - 6 * 86400_000).toISOString().slice(0, 10)).reduce((s, [, v]) => s + v, 0) / 60);
  const streak = streakOf(studyDays);
  const started = next && progress[next.lesson.id]?.status === 'started';

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <div className="small muted">Niveau</div>
          <h1 style={{ margin: 0 }}>{levelName(doneFree, freeLessons.length)}</h1>
        </div>
        <span className="badge gold" aria-label={`Série de ${streak} jours`}><Icon name="flame" size={16} /> {streak} jour{streak > 1 ? 's' : ''}</span>
      </div>

      {backend && !userId && (
        <Card tone="soft">
          <p className="small" style={{ margin: 0 }}>Mode découverte : votre progression est gardée sur cet appareil. <a href="#/auth/inscription">Créez un compte</a> pour la sauvegarder et la retrouver partout.</p>
        </Card>
      )}

      {next ? (
        <Card tone="accent">
          <div className="small muted">Module {next.module.id} · {next.module.title}</div>
          <h2 style={{ margin: '.2rem 0 .6rem' }}>{next.lesson.title}</h2>
          <ProgressBar value={freeLessons.length ? doneFree / freeLessons.length : 0} label="Progression du parcours gratuit" />
          <p className="small muted" style={{ margin: '.3rem 0 .8rem' }}>Parcours gratuit : {Math.round((doneFree / Math.max(1, freeLessons.length)) * 100)} %</p>
          <LinkButton href={`#/lecon/${next.lesson.id}`} variant="primary" block>{started ? 'Reprendre ma leçon' : 'Commencer la leçon'}</LinkButton>
        </Card>
      ) : (
        <Card tone="gold">
          <h2>Parcours gratuit terminé</h2>
          <p>Bravo, vous avez validé les cinq premiers modules.</p>
          {!entitlement.premium && <LinkButton href="#/premium" variant="primary">Découvrir la suite : la conjugaison</LinkButton>}
        </Card>
      )}

      <Card>
        <div className="spread"><h2 style={{ margin: 0 }}>Révisions prioritaires</h2><span className="badge">{due.length}</span></div>
        {due.length ? (
          <>
            <p className="ar ar-lg" style={{ margin: '.25rem 0' }}>{due.slice(0, 6).map((c) => reviewLabel(c.key)).filter((x) => /[؀-ۿ]/.test(x)).join('  ')}</p>
            <p className="small muted">{due.slice(0, 6).map((c) => reviewLabel(c.key)).filter((x) => !/[؀-ۿ]/.test(x)).join(', ')}</p>
            <LinkButton href="#/revisions" block>Réviser maintenant</LinkButton>
          </>
        ) : (
          <p className="small muted" style={{ margin: '.5rem 0 0' }}>Rien à réviser pour l’instant. Vos erreurs en exercice créent automatiquement des révisions.</p>
        )}
      </Card>

      <div className="grid2">
        <Card><div className="small muted">Objectif du jour</div><strong>{todayMin} / {settings.dailyGoalMin} min</strong><ProgressBar value={todayMin / settings.dailyGoalMin} label="Objectif du jour" /></Card>
        <Card><div className="small muted">Cette semaine</div><strong>{weekMin} min</strong></Card>
        <Card><div className="small muted">Leçons validées</div><strong>{Object.values(progress).filter(isCompleted).length}</strong></Card>
        <Card><div className="small muted">Jours d’étude</div><strong>{Object.values(studyDays).filter((s) => s > 0).length}</strong></Card>
      </div>
    </div>
  );
}

export type { Module };

import { PASS_THRESHOLD, type Lesson, type LessonProgress, type Step } from '@coran/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Ar, FormsTable, LetterCard, Mixed, QuranQuote, Translit } from '../components/arabic';
import { AudioButton } from '../components/audio';
import { ExerciseView } from '../components/exercise';
import { Button, Card, ErrorState, Icon, LinkButton, ProgressBar, Skeleton } from '../components/ui';
import { loadLesson } from '../lib/content';
import { AppError, messageOf, toAppError } from '../lib/errors';
import { navigate } from '../lib/router';
import { useStore } from '../lib/store';
import { PremiumOffer } from './Premium';

function StepView({ step, moduleId }: { step: Step; moduleId: number }) {
  switch (step.kind) {
    case 'explain':
      return <p style={{ fontSize: '1.05rem' }}><Mixed text={step.text} /></p>;
    case 'tip':
      return <Card tone="soft"><p style={{ margin: 0 }}><strong>Astuce · </strong><Mixed text={step.text} /></p></Card>;
    case 'letter':
      return <LetterCard letterId={step.letterId} />;
    case 'forms':
      return <FormsTable letterId={step.letterId} />;
    case 'example':
      return (
        <Card>
          <div className="small muted">Exemple pédagogique</div>
          <div className="center"><Ar size="xl">{step.ar}</Ar></div>
          <div className="center"><Translit text={step.translit} lessonPosition={moduleId} />{step.fr && <span> — « {step.fr} »</span>}</div>
          {step.note && <p className="small muted" style={{ margin: '.5rem 0 0' }}><Mixed text={step.note} /></p>}
          <AudioButton audioKey={step.audio} />
        </Card>
      );
    case 'quran':
      return <QuranQuote quranRef={step.ref} fr={step.fr} />;
    case 'table':
      return (
        <Card>
          <table className="t">
            <caption className="small muted" style={{ textAlign: 'start' }}>{step.caption}</caption>
            <thead><tr>{step.head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
            <tbody>
              {step.rows.map((r, i) => (
                <tr key={i}>{r.map((c, j) => (step.arCols?.includes(j) ? <td key={j} className="ar">{c}</td> : <td key={j}><Mixed text={c} /></td>))}</tr>
              ))}
            </tbody>
          </table>
        </Card>
      );
  }
}

/** Regroupe les étapes en écrans courts (une notion par écran). */
function screens(steps: Step[]): Step[][] {
  const out: Step[][] = [];
  let cur: Step[] = [];
  for (const s of steps) {
    cur.push(s);
    if (s.kind !== 'explain' || cur.length >= 2) {
      out.push(cur);
      cur = [];
    }
  }
  if (cur.length) out.push(cur);
  return out;
}

export function LessonPage({ id }: { id: string }) {
  const { catalog, progress, touchLesson, submitAttempt, logStudy, userId, backend } = useStore();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [phase, setPhase] = useState<'steps' | 'exercises' | 'result'>('steps');
  const [screen, setScreen] = useState(0);
  const [exIndex, setExIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const missed = useRef<string[]>([]);
  const [result, setResult] = useState<LessonProgress | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setError(null);
    setLesson(null);
    loadLesson(id, catalog)
      .then((l) => {
        setLesson(l);
        const saved = progress[id];
        const resumeAt = saved?.status === 'started' ? saved.stepIndex : 0;
        if (l.kind !== 'lesson' || screens(l.steps).length === 0) setPhase('exercises');
        else setScreen(Math.min(resumeAt, screens(l.steps).length - 1));
      })
      .catch((e) => setError(toAppError(e, 'load')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, catalog]);
  useEffect(load, [load]);

  // Temps d'étude : compté seulement quand l'onglet est visible
  useEffect(() => {
    let acc = 0;
    const t = window.setInterval(() => {
      if (document.visibilityState === 'visible') acc += 15;
      if (acc >= 60) {
        logStudy(acc);
        acc = 0;
      }
    }, 15_000);
    return () => {
      window.clearInterval(t);
      if (acc > 0) logStudy(acc);
    };
  }, [logStudy]);

  if (error?.kind === 'premium_required') {
    return (
      <div className="stack">
        <a href="#/apprendre" className="small">← Parcours</a>
        <PremiumOffer intro="Cette leçon fait partie de l’offre Premium." />
      </div>
    );
  }
  if (error) return <ErrorState message={error.message} onRetry={load} />;
  if (!lesson) return <Skeleton lines={4} />;

  const sc = screens(lesson.steps);
  const total = lesson.exercises.length;
  const moduleTitle = catalog.find((m) => m.id === lesson.moduleId)?.title ?? '';
  const progressValue = phase === 'steps' ? (screen / (sc.length + total)) : phase === 'exercises' ? ((sc.length + exIndex) / (sc.length + total)) : 1;

  async function finish(finalCorrect: number) {
    setSaving(true);
    try {
      const r = await submitAttempt(lesson!.id, finalCorrect, total, [...new Set(missed.current)]);
      setResult(r);
    } catch (e) {
      setError(toAppError(e));
    } finally {
      setSaving(false);
      setPhase('result');
    }
  }

  function onExercise(ok: boolean) {
    const ex = lesson!.exercises[exIndex]!;
    const nextCorrect = correct + (ok ? 1 : 0);
    if (!ok && ex.reviewKey) missed.current.push(ex.reviewKey);
    setCorrect(nextCorrect);
    if (exIndex + 1 < total) setExIndex(exIndex + 1);
    else void finish(nextCorrect);
  }

  function restart() {
    setCorrect(0);
    setExIndex(0);
    missed.current = [];
    setResult(null);
    setPhase('exercises');
  }

  const score = total ? correct / total : 0;
  const passed = score >= PASS_THRESHOLD;
  const nextLesson = (() => {
    const all = catalog.flatMap((m) => m.lessons);
    const i = all.findIndex((l) => l.id === lesson.id);
    return all[i + 1];
  })();
  const nextIsPremium = nextLesson && catalog.find((m) => m.id === nextLesson.moduleId)?.tier === 'premium';

  return (
    <div className="stack">
      <div className="row">
        <button type="button" className="btn icon ghost" aria-label="Quitter la leçon (progression enregistrée)" onClick={() => navigate(`/module/${lesson.moduleId}`)}><Icon name="x" /></button>
        <div style={{ flex: 1 }}><ProgressBar value={progressValue} label="Avancement dans la leçon" /></div>
      </div>
      <div className="small" style={{ color: 'var(--gold-ink)' }}>Module {lesson.moduleId} · {moduleTitle}</div>
      <h1>{lesson.title}</h1>

      {phase === 'steps' && (
        <>
          {screen === 0 && <Card tone="soft"><strong>Objectif : </strong><Mixed text={lesson.objective} /></Card>}
          <div className="stack">{sc[screen]?.map((s, i) => <StepView key={i} step={s} moduleId={lesson.moduleId} />)}</div>
          <div className="sticky-bottom row">
            {screen > 0 && <Button onClick={() => setScreen(screen - 1)}>Retour</Button>}
            <Button variant="primary" className="grow" style={{ flex: 1 }} onClick={() => {
              if (screen + 1 < sc.length) {
                setScreen(screen + 1);
                touchLesson(lesson.id, screen + 1);
              } else {
                touchLesson(lesson.id, screen);
                setPhase('exercises');
              }
            }}>{screen + 1 < sc.length ? 'Continuer' : 'Passer aux exercices'}</Button>
          </div>
        </>
      )}

      {phase === 'exercises' && lesson.exercises[exIndex] && (
        <ExerciseView key={lesson.exercises[exIndex]!.id} exercise={lesson.exercises[exIndex]!} index={exIndex} total={total} onNext={onExercise} />
      )}
      {phase === 'exercises' && saving && <Skeleton lines={1} />}

      {phase === 'result' && (
        <div className="stack" aria-live="polite">
          <Card tone={passed ? 'soft' : undefined}>
            <h2>{passed ? (lesson.kind === 'lesson' ? 'Leçon validée' : 'Test réussi') : 'Pas encore validé'}</h2>
            <p style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>{correct} / {total} · {Math.round(score * 100)} %</p>
            <p className="small">
              {passed
                ? 'Les notions manquées ont été ajoutées à vos révisions.'
                : `Il faut ${Math.round(PASS_THRESHOLD * 100)} % de bonnes réponses pour valider. Relisez les explications puis réessayez : rien n’est perdu.`}
            </p>
            {result && !userId && backend && <p className="small muted" style={{ margin: 0 }}>Mode découverte : résultat gardé sur cet appareil. <a href="#/auth/inscription">Créer un compte</a> pour le sauvegarder.</p>}
          </Card>
          <Card>
            <h3>À retenir</h3>
            <ul>{lesson.summary.map((s, i) => <li key={i}><Mixed text={s} /></li>)}</ul>
          </Card>
          {lesson.kind === 'final_exam' && passed && (
            <Card tone="gold">
              <h2>Bilan du parcours gratuit</h2>
              <p>Vous savez reconnaître les 28 lettres et leurs formes, lire les voyelles et les signes, déchiffrer des mots vocalisés et comprendre une quarantaine de mots fréquents du Coran avec leur racine.</p>
              <p className="small muted">Vous pouvez continuer à réviser gratuitement aussi longtemps que vous le souhaitez.</p>
              <LinkButton href="#/premium" variant="primary">Poursuivre avec la conjugaison</LinkButton>
            </Card>
          )}
          <div className="stack">
            {!passed && <Button variant="primary" block onClick={restart}>Refaire les exercices</Button>}
            {passed && nextLesson && !nextIsPremium && <LinkButton href={`#/lecon/${nextLesson.id}`} variant="primary" block>Leçon suivante : {nextLesson.title}</LinkButton>}
            {passed && nextIsPremium && lesson.kind !== 'final_exam' && <LinkButton href="#/premium" variant="primary" block>Voir la suite du parcours</LinkButton>}
            {passed && <Button block onClick={restart}>Refaire pour m’entraîner</Button>}
            <LinkButton href={`#/module/${lesson.moduleId}`} block>Retour au module</LinkButton>
          </div>
        </div>
      )}
    </div>
  );
}

export { messageOf };

import { isCompleted, weakest } from '@coran/core';
import { useEffect, useState } from 'react';
import { Card, EmptyState, LinkButton, ProgressBar } from '../components/ui';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { reviewLabel } from './Dashboard';

type Result = { lesson_id: string; kind: string; correct: number; total: number; created_at: string };

export function ProgressPage() {
  const { catalog, progress, cards, userId } = useStore();
  const [results, setResults] = useState<Result[] | null>(null);

  useEffect(() => {
    if (!supabase || !userId) return;
    supabase.from('quiz_results').select('lesson_id, kind, correct, total, created_at').in('kind', ['module_test', 'final_exam']).order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => setResults(data ?? []));
  }, [userId]);

  const anyProgress = Object.keys(progress).length > 0;
  if (!anyProgress) return <EmptyState title="Votre progression" text="Vos compétences, vos résultats et les leçons à revoir apparaîtront ici après votre première leçon." action={<LinkButton href="#/" variant="primary">Commencer</LinkButton>} />;

  const weak = weakest(cards);
  const toReview = catalog.flatMap((m) => m.lessons).filter((l) => progress[l.id]?.status === 'to_review' || (progress[l.id]?.attempts && !isCompleted(progress[l.id])));
  const lessonTitle = (id: string) => catalog.flatMap((m) => m.lessons).find((l) => l.id === id)?.title ?? id;

  return (
    <div className="stack">
      <h1>Progression</h1>
      <Card>
        <h2>Compétences</h2>
        <div className="stack">
          {catalog.map((m) => {
            const lessons = m.lessons.filter((l) => l.kind === 'lesson');
            const done = lessons.filter((l) => isCompleted(progress[l.id])).length;
            if (m.tier === 'premium' && done === 0) return null;
            return (
              <div key={m.id}>
                <div className="spread small"><span>{m.title}</span><span>{done} / {lessons.length}</span></div>
                <ProgressBar value={lessons.length ? done / lessons.length : 0} label={m.title} />
              </div>
            );
          })}
        </div>
      </Card>
      <Card>
        <h2>Points à travailler</h2>
        {weak.length ? (
          <ul>{weak.map((c) => <li key={c.key}><span className="ar">{reviewLabel(c.key)}</span> — manqué {c.lapses} fois</li>)}</ul>
        ) : <p className="small muted">Aucune difficulté repérée pour l’instant.</p>}
        {weak.length > 0 && <LinkButton href="#/revisions">Réviser maintenant</LinkButton>}
      </Card>
      <Card>
        <h2>Leçons à revoir</h2>
        {toReview.length ? <ul>{toReview.map((l) => <li key={l.id}><a href={`#/lecon/${l.id}`}>{l.title}</a> — meilleur score {Math.round((progress[l.id]?.bestScore ?? 0) * 100)} %</li>)}</ul> : <p className="small muted">Aucune.</p>}
      </Card>
      <Card>
        <h2>Résultats des tests</h2>
        {!userId && <p className="small muted">L’historique détaillé des tests est disponible avec un compte.</p>}
        {results && results.length === 0 && <p className="small muted">Aucun test de fin de module passé pour l’instant.</p>}
        {results && results.length > 0 && (
          <table className="t">
            <thead><tr><th>Test</th><th>Score</th><th>Date</th></tr></thead>
            <tbody>{results.map((r, i) => <tr key={i}><td>{lessonTitle(r.lesson_id)}</td><td>{r.correct}/{r.total}</td><td>{new Date(r.created_at).toLocaleDateString('fr-FR')}</td></tr>)}</tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

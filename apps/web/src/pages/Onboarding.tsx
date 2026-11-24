import { useState } from 'react';
import { Button, ProgressBar } from '../components/ui';
import { navigate } from '../lib/router';
import { useStore } from '../lib/store';

type Q = { id: string; title: string; options: [string, string][] };
const QUESTIONS: Q[] = [
  { id: 'alphabet', title: 'Connaissez-vous l’alphabet arabe ?', options: [['no', 'Non, pas du tout'], ['some', 'Quelques lettres'], ['yes', 'Oui, toutes les lettres']] },
  { id: 'reading', title: 'Savez-vous lire quelques mots arabes vocalisés ?', options: [['no', 'Non'], ['slow', 'Oui, lentement'], ['yes', 'Oui, assez bien']] },
  { id: 'goal', title: 'Quel est votre objectif ?', options: [['read', 'Lire le Coran'], ['understand', 'Comprendre ce que je lis'], ['both', 'Les deux']] },
  { id: 'time', title: 'Combien de temps par jour ?', options: [['5', '5 minutes'], ['10', '10 minutes'], ['15', '15 minutes'], ['20', '20 minutes']] },
];

/** Recommandation de départ ; elle ne bloque jamais rien. */
function recommend(a: Record<string, string>): { module: number; text: string } {
  if (a.alphabet === 'yes' && a.reading === 'yes') return { module: 4, text: 'Vous lisez déjà : nous vous conseillons de commencer au module 4 (lecture), puis le vocabulaire.' };
  if (a.alphabet === 'yes') return { module: 3, text: 'Vous connaissez les lettres : nous vous conseillons de commencer au module 3 (voyelles et signes).' };
  if (a.alphabet === 'some') return { module: 1, text: 'Nous vous conseillons de commencer par l’alphabet : les premières leçons iront vite pour vous.' };
  return { module: 1, text: 'Nous commençons ensemble par l’alphabet, une lettre après l’autre.' };
}

export function Onboarding() {
  const { updateSettings, catalog } = useStore();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const q = QUESTIONS[step];

  async function finish(startModule: number) {
    await updateSettings({ dailyGoalMin: Number(answers.time ?? 10), onboarding: { done: true, knowsAlphabet: answers.alphabet, goal: answers.goal, startModule } });
    const first = catalog.find((m) => m.id === startModule)?.lessons[0];
    navigate(first ? `/lecon/${first.id}` : '/');
  }

  if (!q) {
    const r = recommend(answers);
    return (
      <div className="stack">
        <h1>Votre point de départ</h1>
        <div className="card soft"><p style={{ margin: 0 }}>{r.text}</p></div>
        <Button variant="primary" block onClick={() => finish(r.module)}>Commencer au module {r.module}</Button>
        {r.module !== 1 && <Button block onClick={() => finish(1)}>Commencer au début quand même</Button>}
      </div>
    );
  }
  return (
    <div className="stack">
      <ProgressBar value={step / QUESTIONS.length} label="Progression du questionnaire" />
      <p className="small muted">Question {step + 1} sur {QUESTIONS.length}</p>
      <h1>{q.title}</h1>
      <div className="stack" role="radiogroup" aria-label={q.title}>
        {q.options.map(([v, label]) => (
          <button key={v} type="button" role="radio" aria-checked={answers[q.id] === v} className={`option${answers[q.id] === v ? ' correct' : ''}`} style={{ textAlign: 'start' }}
            onClick={() => { setAnswers({ ...answers, [q.id]: v }); setStep(step + 1); }}>
            {label}
          </button>
        ))}
      </div>
      <div className="spread">
        {step > 0 ? <Button variant="ghost" onClick={() => setStep(step - 1)}>Retour</Button> : <span />}
        <Button variant="ghost" onClick={() => setStep(step + 1)}>Passer</Button>
      </div>
    </div>
  );
}

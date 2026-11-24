import { evaluate, seededShuffle, type Answer, type Exercise, type Feedback, type Option } from '@coran/core';
import { useMemo, useState } from 'react';
import { useAudio } from '../lib/audio';
import { useStore } from '../lib/store';
import { Ar, Mixed, QuranQuote } from './arabic';
import { AudioButton } from './audio';
import { Button, Icon } from './ui';

const OK = ['Bien vu.', 'Exact.', 'C’est juste.', 'Très bien.'];
const KO = ['Pas tout à fait.', 'Presque.', 'Regardons ensemble.'];

function OptionLabel({ o }: { o: Option }) {
  return (
    <>
      {o.ar && <Ar size="lg">{o.ar}</Ar>}
      {o.ar && o.label && <br />}
      {o.label && <span>{o.label}</span>}
    </>
  );
}

export function ExerciseView({ exercise, index, total, onNext }: { exercise: Exercise; index: number; total: number; onNext: (correct: boolean) => void }) {
  const { settings } = useStore();
  const audio = useAudio(exercise.audio, settings.audioRate);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [choice, setChoice] = useState<string | null>(null);
  const [pairs, setPairs] = useState<Record<string, string>>({});
  const [leftSel, setLeftSel] = useState<string | null>(null);
  const [placement, setPlacement] = useState<Record<string, string>>({});
  const [itemSel, setItemSel] = useState<string | null>(null);
  const [sequence, setSequence] = useState<string[]>([]);

  const shuffledRight = useMemo(() => (exercise.type === 'match' ? seededShuffle(exercise.pairs.map((p) => p.right), `${exercise.id}-r`) : []), [exercise]);
  const shuffledPieces = useMemo(() => (exercise.type === 'order' ? seededShuffle(exercise.pieces, `${exercise.id}-o`) : []), [exercise]);
  const done = feedback !== null;
  const listenWithoutAudio = exercise.type === 'choice' && exercise.format === 'listen' && (audio.status === 'unavailable' || audio.status === 'error');
  const prompt = listenWithoutAudio && exercise.textFallback ? exercise.textFallback : exercise.prompt;

  function check() {
    let answer: Answer;
    switch (exercise.type) {
      case 'choice':
        if (!choice) return setError('Choisissez une réponse.');
        answer = { type: 'choice', optionId: choice };
        break;
      case 'match':
        if (Object.keys(pairs).length < exercise.pairs.length) return setError('Associez tous les éléments avant de vérifier.');
        answer = { type: 'match', pairs };
        break;
      case 'sort':
        if (Object.keys(placement).length < exercise.items.length) return setError('Placez tous les éléments avant de vérifier.');
        answer = { type: 'sort', placement };
        break;
      case 'order':
        if (sequence.length < exercise.pieces.length) return setError('Utilisez tous les morceaux avant de vérifier.');
        answer = { type: 'order', sequence };
        break;
    }
    setError(null);
    setFeedback(evaluate(exercise, answer));
  }

  return (
    <section className="stack" aria-labelledby={`q-${exercise.id}`}>
      <div className="spread small muted"><span>Exercice {index + 1} sur {total}</span></div>
      <h2 id={`q-${exercise.id}`}><Mixed text={prompt} /></h2>
      {exercise.quranRef && <QuranQuote quranRef={exercise.quranRef} />}
      {exercise.ar && <div className="card center"><Ar size="xl">{exercise.ar}</Ar></div>}
      {exercise.audio && !listenWithoutAudio && <AudioButton audioKey={exercise.audio} label="Écouter" autoPlay />}
      {listenWithoutAudio && (
        <p className="small muted row" role="note" style={{ margin: 0 }}>
          <Icon name="mute" size={18} /> Enregistrement bientôt disponible : l’exercice utilise la description du son en attendant.
        </p>
      )}

      {exercise.type === 'choice' && (
        <div className="options" role="group" aria-label="Réponses possibles">
          {exercise.options.map((o) => {
            const state = done ? (o.id === exercise.answer ? 'correct' : o.id === choice ? 'wrong' : '') : '';
            return (
              <button key={o.id} type="button" className={`option ${state}`} aria-pressed={choice === o.id} disabled={done}
                onClick={() => { setChoice(o.id); setError(null); }}>
                <OptionLabel o={o} />
                {state === 'correct' && <span className="sr-only"> (bonne réponse)</span>}
              </button>
            );
          })}
        </div>
      )}

      {exercise.type === 'match' && (
        <div className="grid2">
          <div className="stack" role="group" aria-label="Éléments à associer">
            {exercise.pairs.map(({ left }) => (
              <button key={left.id} type="button" className="option" aria-pressed={leftSel === left.id} disabled={done}
                onClick={() => { setLeftSel(left.id); setError(null); }}>
                <OptionLabel o={left} />
                {pairs[left.id] && <div className="small">→ {shuffledRight.find((r) => r.id === pairs[left.id])?.label ?? shuffledRight.find((r) => r.id === pairs[left.id])?.ar}</div>}
              </button>
            ))}
          </div>
          <div className="stack" role="group" aria-label="Correspondances">
            {shuffledRight.map((r) => {
              const used = Object.values(pairs).includes(r.id);
              return (
                <button key={r.id} type="button" className="option" aria-pressed={used} disabled={done || !leftSel}
                  onClick={() => {
                    if (!leftSel) return;
                    const next = Object.fromEntries(Object.entries(pairs).filter(([, v]) => v !== r.id));
                    next[leftSel] = r.id;
                    setPairs(next);
                    setLeftSel(null);
                  }}>
                  <OptionLabel o={r} />
                </button>
              );
            })}
          </div>
          {!done && <p className="small muted" style={{ gridColumn: '1 / -1' }}>Touchez un élément à gauche, puis sa correspondance à droite.</p>}
        </div>
      )}

      {exercise.type === 'sort' && (
        <div className="stack">
          <div className="row" role="group" aria-label="Éléments à classer">
            {exercise.items.filter((it) => !placement[it.id]).map((it) => (
              <button key={it.id} type="button" className="chip" aria-pressed={itemSel === it.id} disabled={done} onClick={() => { setItemSel(it.id); setError(null); }}>
                <OptionLabel o={it} />
              </button>
            ))}
          </div>
          <div className="grid2">
            {exercise.buckets.map((b) => (
              <div key={b.id} className="sort-bucket">
                <button type="button" className="btn ghost block" disabled={done || !itemSel} onClick={() => { if (itemSel) { setPlacement({ ...placement, [itemSel]: b.id }); setItemSel(null); } }}>
                  {b.label}{itemSel ? ' — placer ici' : ''}
                </button>
                <div className="row">
                  {exercise.items.filter((it) => placement[it.id] === b.id).map((it) => {
                    const ok = done ? it.bucket === b.id : null;
                    return (
                      <button key={it.id} type="button" className={`chip ${ok === false ? 'wrong' : ''}`} disabled={done}
                        style={ok === false ? { borderColor: 'var(--error)' } : ok ? { borderColor: 'var(--primary)' } : undefined}
                        onClick={() => { const p = { ...placement }; delete p[it.id]; setPlacement(p); }} aria-label={`Retirer de ${b.label}`}>
                        <OptionLabel o={it} />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {!done && <p className="small muted">Touchez un élément, puis la catégorie où il doit aller.</p>}
        </div>
      )}

      {exercise.type === 'order' && (
        <div className="stack">
          <div className="card" dir="rtl" style={{ minHeight: 72 }} aria-label="Votre réponse, lue de droite à gauche">
            <div className="row">
              {sequence.map((id) => {
                const p = exercise.pieces.find((x) => x.id === id)!;
                return <button key={id} type="button" className="chip" disabled={done} onClick={() => setSequence(sequence.filter((s) => s !== id))}><OptionLabel o={p} /></button>;
              })}
            </div>
          </div>
          <div className="row" dir="rtl" role="group" aria-label="Morceaux disponibles">
            {shuffledPieces.filter((p) => !sequence.includes(p.id)).map((p) => (
              <button key={p.id} type="button" className="chip" disabled={done} onClick={() => { setSequence([...sequence, p.id]); setError(null); }}><OptionLabel o={p} /></button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="field-error" role="alert">{error}</p>}

      {feedback && (
        <div className={`feedback ${feedback.correct ? 'ok' : 'ko'}`} role="status" aria-live="polite">
          <p style={{ fontWeight: 700 }}>
            <Icon name={feedback.correct ? 'check' : 'x'} size={20} /> {(feedback.correct ? OK : KO)[index % (feedback.correct ? OK.length : KO.length)]}
          </p>
          {feedback.mistake && <p><Mixed text={feedback.mistake} /></p>}
          <p style={{ marginBottom: 0 }}><Mixed text={feedback.explanation} /></p>
          {!feedback.correct && exercise.reviewKey && <p className="small" style={{ margin: '.5rem 0 0' }}>Cette notion est ajoutée à vos révisions.</p>}
          {!feedback.correct && exercise.audio && audio.status !== 'unavailable' && <AudioButton audioKey={exercise.audio} label="Réécouter la bonne réponse" />}
        </div>
      )}

      <div className="sticky-bottom">
        {done ? (
          <Button variant="primary" block onClick={() => onNext(feedback!.correct)}>Continuer</Button>
        ) : (
          <Button variant="primary" block onClick={check}>Vérifier</Button>
        )}
      </div>
    </section>
  );
}

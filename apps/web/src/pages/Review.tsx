import { dueQueue, LETTER_BY_ID } from '@coran/core';
import { useMemo, useState } from 'react';
import { Ar } from '../components/arabic';
import { AudioButton } from '../components/audio';
import { Button, Card, EmptyState, LinkButton } from '../components/ui';
import { useStore } from '../lib/store';
import vocab from '../content/free-content.json';

type Vocab = { id: string; ar: string; translit: string; fr: string; root: string | null };
// Le vocabulaire gratuit est extrait des étapes « exemple » du module 5.
const WORDS: Record<string, Vocab> = Object.fromEntries(
  (vocab as unknown as { modules: { id: number; lessons: { steps: { kind: string; audio?: string; ar?: string; translit?: string; fr?: string }[] }[] }[] }).modules
    .flatMap((m) => m.lessons.flatMap((l) => l.steps))
    .filter((s) => s.kind === 'example' && s.audio?.startsWith('word:'))
    .map((s) => [s.audio!.slice(5), { id: s.audio!.slice(5), ar: s.ar!, translit: s.translit ?? '', fr: s.fr ?? '', root: null }]),
);

const HARAKA: Record<string, [string, string]> = {
  a: ['ـَ', 'fatḥa : « a » bref'], i: ['ـِ', 'kasra : « i » bref'], u: ['ـُ', 'ḍamma : « u » bref'],
  sukun: ['ـْ', 'sukūn : aucune voyelle'], shadda: ['ـّ', 'shadda : consonne doublée'], tanwin: ['ـٌ ـً ـٍ', 'tanwīn : un / an / in'],
};

function describe(key: string): { front: string | null; question: string; answer: string; audio?: string } {
  const [kind, id = ''] = key.split(':');
  if (kind === 'letter') {
    const l = LETTER_BY_ID[id];
    if (l) return { front: l.ar, question: 'Quel est le nom et le son de cette lettre ?', answer: `${l.name} — « ${l.translit} » : ${l.sound}`, audio: `letter:${l.id}` };
  }
  if (kind === 'word' && WORDS[id]) {
    const w = WORDS[id]!;
    return { front: w.ar, question: 'Que signifie ce mot ?', answer: `${w.translit} — ${w.fr}`, audio: key };
  }
  if (kind === 'haraka' && HARAKA[id]) return { front: HARAKA[id]![0], question: 'Quel est ce signe ?', answer: HARAKA[id]![1] };
  if (kind === 'form') {
    const l = LETTER_BY_ID[id];
    if (l) return { front: `${l.ar}ـ  ـ${l.ar}ـ  ـ${l.ar}`, question: `De quelle lettre s’agit-il (formes initiale, médiane, finale) ?`, answer: l.name };
  }
  return { front: null, question: 'Notion à revoir', answer: key.replace(/^[a-z]+:/, '').replace(/[-_]/g, ' ') };
}

export function ReviewPage() {
  const { cards, gradeCard } = useStore();
  const queue = useMemo(() => dueQueue(cards), [cards.length]); // file figée pendant la session
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(false);
  const [stats, setStats] = useState({ good: 0, again: 0 });

  if (!cards.length) {
    return <EmptyState title="Vos révisions" text="Rien à réviser pour l’instant. Chaque erreur en exercice crée une carte de révision qui reviendra au bon moment." action={<LinkButton href="#/" variant="primary">Continuer ma leçon</LinkButton>} />;
  }
  const card = queue[i];
  if (!card) {
    const nextDue = [...cards].sort((a, b) => a.due.localeCompare(b.due))[0];
    return (
      <EmptyState
        title={stats.good + stats.again ? 'Session terminée' : 'Tout est à jour'}
        text={stats.good + stats.again ? `${stats.good} notion(s) sue(s), ${stats.again} à revoir. ${nextDue ? `Prochaine révision : ${new Date(nextDue.due).toLocaleDateString('fr-FR')}.` : ''}` : `Vos prochaines révisions arrivent ${nextDue ? `le ${new Date(nextDue.due).toLocaleDateString('fr-FR')}` : 'bientôt'}.`}
        action={<LinkButton href="#/" variant="primary">Retour à l’accueil</LinkButton>}
      />
    );
  }
  const d = describe(card.key);
  const answer = (r: 'good' | 'again') => {
    gradeCard(card.key, r);
    setStats((s) => ({ ...s, [r]: s[r] + 1 }));
    setShown(false);
    setI(i + 1);
  };
  return (
    <div className="stack">
      <div className="spread"><h1>Révisions</h1><span className="small muted">{i + 1} / {queue.length}</span></div>
      <Card>
        <p className="small muted">{d.question}</p>
        {d.front && <div className="center"><Ar size="xl">{d.front}</Ar></div>}
        {shown ? (
          <div className="feedback ok" role="status">
            <p style={{ margin: 0 }}>{d.answer}</p>
            {d.audio && <AudioButton audioKey={d.audio} compact />}
          </div>
        ) : (
          <Button block onClick={() => setShown(true)}>Voir la réponse</Button>
        )}
      </Card>
      {shown && (
        <div className="grid2 sticky-bottom">
          <Button onClick={() => answer('again')}>À revoir</Button>
          <Button variant="primary" onClick={() => answer('good')}>Je savais</Button>
        </div>
      )}
      {card.lapses > 1 && <p className="small muted">Notion déjà manquée {card.lapses} fois : elle reviendra plus souvent.</p>}
    </div>
  );
}

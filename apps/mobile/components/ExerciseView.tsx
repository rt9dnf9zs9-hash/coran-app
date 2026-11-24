import { evaluate, seededShuffle, type Answer, type Exercise, type Feedback, type Option } from '@coran/core';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ar, AudioBtn, Btn, C, s, T } from './ui';

const Label = ({ o }: { o: Option }) => (
  <View style={{ alignItems: 'center' }}>
    {o.ar ? <Ar size={1.3}>{o.ar}</Ar> : null}
    {o.label ? <T>{o.label}</T> : null}
  </View>
);

/** Les quatre familles d'exercices (choix, association, classement, ordre) avec correction expliquée. */
export function ExerciseView({ ex, index, total, onNext }: { ex: Exercise; index: number; total: number; onNext: (ok: boolean) => void }) {
  const [fb, setFb] = useState<Feedback | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [choice, setChoice] = useState<string | null>(null);
  const [pairs, setPairs] = useState<Record<string, string>>({});
  const [left, setLeft] = useState<string | null>(null);
  const [placement, setPlacement] = useState<Record<string, string>>({});
  const [item, setItem] = useState<string | null>(null);
  const [seq, setSeq] = useState<string[]>([]);
  const rights = useMemo(() => (ex.type === 'match' ? seededShuffle(ex.pairs.map((p) => p.right), `${ex.id}-r`) : []), [ex]);
  const pieces = useMemo(() => (ex.type === 'order' ? seededShuffle(ex.pieces, `${ex.id}-o`) : []), [ex]);

  function check() {
    let a: Answer;
    if (ex.type === 'choice') { if (!choice) return setErr('Choisissez une réponse.'); a = { type: 'choice', optionId: choice }; }
    else if (ex.type === 'match') { if (Object.keys(pairs).length < ex.pairs.length) return setErr('Associez tous les éléments.'); a = { type: 'match', pairs }; }
    else if (ex.type === 'sort') { if (Object.keys(placement).length < ex.items.length) return setErr('Placez tous les éléments.'); a = { type: 'sort', placement }; }
    else { if (seq.length < ex.pieces.length) return setErr('Utilisez tous les morceaux.'); a = { type: 'order', sequence: seq }; }
    setErr(null);
    setFb(evaluate(ex, a));
  }

  const opt = (selected: boolean, state?: 'ok' | 'ko') => [s.option, selected && { borderColor: C.primary, backgroundColor: C.soft }, state === 'ok' && { borderColor: C.primary, backgroundColor: C.soft }, state === 'ko' && { borderColor: C.error, backgroundColor: C.errorSoft }];

  return (
    <View style={{ gap: 12 }}>
      <T size={13} muted>Exercice {index + 1} sur {total}</T>
      <T size={20} bold>{ex.prompt}</T>
      {ex.ar ? <View style={{ alignItems: 'center' }}><Ar size={2.2}>{ex.ar}</Ar></View> : null}
      {ex.audio ? <AudioBtn audioKey={ex.audio} /> : null}
      {ex.type === 'choice' && ex.format === 'listen' && ex.textFallback ? <T size={14} muted>Sans audio : {ex.textFallback}</T> : null}

      {ex.type === 'choice' && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {ex.options.map((o) => (
            <Pressable key={o.id} accessibilityRole="button" accessibilityState={{ selected: choice === o.id }} disabled={!!fb} onPress={() => setChoice(o.id)}
              style={opt(choice === o.id, fb ? (o.id === ex.answer ? 'ok' : o.id === choice ? 'ko' : undefined) : undefined)}>
              <Label o={o} />
            </Pressable>
          ))}
        </View>
      )}
      {ex.type === 'match' && (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, gap: 8 }}>{ex.pairs.map(({ left: l }) => <Pressable key={l.id} disabled={!!fb} onPress={() => setLeft(l.id)} style={opt(left === l.id || !!pairs[l.id])}><Label o={l} /></Pressable>)}</View>
          <View style={{ flex: 1, gap: 8 }}>{rights.map((r) => <Pressable key={r.id} disabled={!!fb || !left} onPress={() => { if (left) { setPairs({ ...Object.fromEntries(Object.entries(pairs).filter(([, v]) => v !== r.id)), [left]: r.id }); setLeft(null); } }} style={opt(Object.values(pairs).includes(r.id))}><Label o={r} /></Pressable>)}</View>
        </View>
      )}
      {ex.type === 'sort' && (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{ex.items.filter((i) => !placement[i.id]).map((i) => <Pressable key={i.id} disabled={!!fb} onPress={() => setItem(i.id)} style={opt(item === i.id)}><Label o={i} /></Pressable>)}</View>
          {ex.buckets.map((b) => (
            <Pressable key={b.id} disabled={!!fb || !item} onPress={() => { if (item) { setPlacement({ ...placement, [item]: b.id }); setItem(null); } }} style={[s.card, { borderStyle: 'dashed', borderWidth: 2 }]}>
              <T bold>{b.label}</T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{ex.items.filter((i) => placement[i.id] === b.id).map((i) => <Label key={i.id} o={i} />)}</View>
            </Pressable>
          ))}
        </View>
      )}
      {ex.type === 'order' && (
        <View style={{ gap: 8 }}>
          <View style={[s.card, { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, minHeight: 64 }]}>{seq.map((id) => <Pressable key={id} disabled={!!fb} onPress={() => setSeq(seq.filter((x) => x !== id))}><Label o={ex.pieces.find((p) => p.id === id)!} /></Pressable>)}</View>
          <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>{pieces.filter((p) => !seq.includes(p.id)).map((p) => <Pressable key={p.id} disabled={!!fb} onPress={() => setSeq([...seq, p.id])} style={opt(false)}><Label o={p} /></Pressable>)}</View>
        </View>
      )}

      {err ? <T style={{ color: C.error }}>{err}</T> : null}
      {fb && (
        <View accessibilityLiveRegion="polite" style={[s.card, { backgroundColor: fb.correct ? C.soft : C.errorSoft, borderColor: 'transparent' }]}>
          <T bold style={{ color: fb.correct ? C.softInk : C.errorInk }}>{fb.correct ? 'Bien vu.' : 'Pas tout à fait.'}</T>
          {fb.mistake ? <T style={{ color: C.errorInk }}>{fb.mistake}</T> : null}
          <T style={{ color: fb.correct ? C.softInk : C.errorInk }}>{fb.explanation}</T>
        </View>
      )}
      {fb ? <Btn variant="primary" title="Continuer" onPress={() => onNext(fb.correct)} /> : <Btn variant="primary" title="Vérifier" onPress={check} />}
    </View>
  );
}

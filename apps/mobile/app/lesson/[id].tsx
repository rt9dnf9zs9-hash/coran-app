import { describeDots, formsOf, LETTER_BY_ID, PASS_THRESHOLD, type Lesson, type Step } from '@coran/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { ExerciseView } from '../../components/ExerciseView';
import { Ar, AudioBtn, Btn, C, Card, Progress, s, T } from '../../components/ui';
import { loadLesson, loadQuran, PremiumRequired } from '../../lib/content';
import { useStore } from '../../lib/store';

function QuranStep({ step }: { step: Extract<Step, { kind: 'quran' }> }) {
  const [text, setText] = useState<string | null | undefined>(undefined);
  useEffect(() => { loadQuran(step.ref).then(setText).catch(() => setText(null)); }, [step]);
  return (
    <Card style={{ backgroundColor: '#F6F0E1', borderColor: '#E3D6B5' }}>
      <T size={13} bold style={{ color: C.goldInk }}>Citation coranique · Sourate {step.ref.surah}, verset {step.ref.ayah}</T>
      {text === undefined ? <ActivityIndicator /> : text ? <Ar size={1.4}>{text}</Ar> : <T size={13} muted>Texte de référence non importé.</T>}
      <T size={13} muted>{step.fr}</T>
    </Card>
  );
}

function StepView({ step }: { step: Step }) {
  switch (step.kind) {
    case 'explain': return <T>{step.text}</T>;
    case 'tip': return <Card tone="soft"><T>{step.text}</T></Card>;
    case 'example': return <Card><View style={{ alignItems: 'center' }}><Ar size={2.2}>{step.ar}</Ar></View><T muted style={{ textAlign: 'center' }}>{step.translit}{step.fr ? ` — « ${step.fr} »` : ''}</T>{step.note ? <T size={13} muted>{step.note}</T> : null}<AudioBtn audioKey={step.audio} /></Card>;
    case 'letter': {
      const l = LETTER_BY_ID[step.letterId];
      if (!l) return null;
      return <Card><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><View style={{ flex: 1 }}><T bold>{l.name}</T><T size={14}>« {l.translit} » — {l.sound}</T><T size={13} muted>{describeDots(l)}</T></View><Ar size={3}>{l.ar}</Ar></View><AudioBtn audioKey={`letter:${l.id}`} /></Card>;
    }
    case 'forms': {
      const l = LETTER_BY_ID[step.letterId];
      if (!l) return null;
      const f = formsOf(l);
      return <Card><T bold>{l.name} : isolée · initiale · médiane · finale</T><View style={{ flexDirection: 'row-reverse', justifyContent: 'space-around' }}>{[f.isolated, f.initial, f.medial, f.final].map((x, k) => <Ar key={k} size={2}>{x}</Ar>)}</View></Card>;
    }
    case 'quran': return <QuranStep step={step} />;
    case 'table': return <Card><T size={13} muted>{step.caption}</T>{step.rows.map((r, i) => <T key={i}>{r.join('  ·  ')}</T>)}</Card>;
  }
}

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { touch, submit } = useStore();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [error, setError] = useState<'premium' | 'load' | null>(null);
  const [phase, setPhase] = useState<'steps' | 'ex' | 'done'>('steps');
  const [i, setI] = useState(0);
  const [correct, setCorrect] = useState(0);
  const missed = useRef<string[]>([]);

  useEffect(() => {
    loadLesson(id).then((l) => { setLesson(l); if (l.kind !== 'lesson') setPhase('ex'); }).catch((e) => setError(e instanceof PremiumRequired ? 'premium' : 'load'));
  }, [id]);

  if (error === 'premium') return <ScrollView style={s.screen} contentContainerStyle={s.content}><Card tone="gold"><T bold>Cette leçon fait partie de l’offre Premium.</T><Btn variant="primary" title="Voir l’offre" onPress={() => router.replace('/premium')} /><Btn title="Continuer le parcours gratuit" onPress={() => router.back()} /></Card></ScrollView>;
  if (error) return <ScrollView style={s.screen} contentContainerStyle={s.content}><Card tone="err"><T>Impossible de charger la leçon. Vérifiez votre connexion.</T><Btn title="Retour" onPress={() => router.back()} /></Card></ScrollView>;
  if (!lesson) return <View style={[s.screen, { justifyContent: 'center' }]}><ActivityIndicator color={C.primary} /></View>;

  const total = lesson.exercises.length;
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <T size={22} bold>{lesson.title}</T>
      <Progress value={phase === 'steps' ? 0.1 : phase === 'ex' ? (i + 1) / (total + 1) : 1} />
      {phase === 'steps' && (
        <>
          <Card tone="soft"><T><T bold>Objectif : </T>{lesson.objective}</T></Card>
          {lesson.steps.map((st, k) => <StepView key={k} step={st} />)}
          <Btn variant="primary" title="Passer aux exercices" onPress={() => { touch(lesson.id, lesson.steps.length); setPhase('ex'); }} />
        </>
      )}
      {phase === 'ex' && lesson.exercises[i] && (
        <ExerciseView key={lesson.exercises[i]!.id} ex={lesson.exercises[i]!} index={i} total={total} onNext={async (ok) => {
          const ex = lesson.exercises[i]!;
          if (!ok && ex.reviewKey) missed.current.push(ex.reviewKey);
          const c = correct + (ok ? 1 : 0);
          setCorrect(c);
          if (i + 1 < total) setI(i + 1);
          else {
            await submit(lesson.id, c, total, [...new Set(missed.current)]).catch(() => undefined);
            setPhase('done');
          }
        }} />
      )}
      {phase === 'done' && (
        <Card tone={correct / total >= PASS_THRESHOLD ? 'soft' : undefined}>
          <T size={20} bold>{correct / total >= PASS_THRESHOLD ? 'Leçon validée' : 'Pas encore validé'}</T>
          <T>{correct} / {total} · {Math.round((correct / total) * 100)} %</T>
          {lesson.summary.map((x, k) => <T key={k} size={14}>• {x}</T>)}
          {correct / total < PASS_THRESHOLD && <Btn variant="primary" title="Refaire les exercices" onPress={() => { setI(0); setCorrect(0); missed.current = []; setPhase('ex'); }} />}
          <Btn title="Retour au parcours" onPress={() => router.back()} />
        </Card>
      )}
    </ScrollView>
  );
}

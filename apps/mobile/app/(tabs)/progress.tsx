import { isCompleted, weakest } from '@coran/core';
import { ScrollView } from 'react-native';
import { Card, Progress, s, T } from '../../components/ui';
import { CATALOG } from '../../lib/content';
import { useStore } from '../../lib/store';

export default function ProgressScreen() {
  const { progress, cards } = useStore();
  const weak = weakest(cards);
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Card>
        <T bold>Compétences</T>
        {CATALOG.map((m) => {
          const lessons = m.lessons.filter((l) => l.kind === 'lesson');
          const done = lessons.filter((l) => isCompleted(progress[l.id])).length;
          return (<Card key={m.id}><T size={14}>{m.title} — {done}/{lessons.length}</T><Progress value={lessons.length ? done / lessons.length : 0} /></Card>);
        })}
      </Card>
      <Card>
        <T bold>Points à travailler</T>
        {weak.length ? weak.map((c) => <T key={c.key} size={14}>{c.key.replace(/^[a-z]+:/, '')} — manqué {c.lapses} fois</T>) : <T muted size={14}>Aucune difficulté repérée.</T>}
      </Card>
    </ScrollView>
  );
}

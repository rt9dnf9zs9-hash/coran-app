import { dueQueue, LETTER_BY_ID } from '@coran/core';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Ar, Btn, Card, s, T } from '../../components/ui';
import { useStore } from '../../lib/store';

export default function Review() {
  const { cards, gradeCard } = useStore();
  const queue = useMemo(() => dueQueue(cards), [cards.length]);
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(false);
  const card = queue[i];
  if (!card) return <ScrollView style={s.screen} contentContainerStyle={s.content}><Card><T bold>Tout est à jour</T><T muted>Vos erreurs en exercice créent des révisions qui reviennent au bon moment.</T></Card></ScrollView>;
  const [kind, id = ''] = card.key.split(':');
  const letter = kind === 'letter' ? LETTER_BY_ID[id] : undefined;
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <T muted>{i + 1} / {queue.length}</T>
      <Card>
        {letter ? <View style={{ alignItems: 'center' }}><Ar size={3}>{letter.ar}</Ar></View> : <T bold>{id.replace(/[-_]/g, ' ')}</T>}
        {shown ? <T>{letter ? `${letter.name} — « ${letter.translit} » : ${letter.sound}` : 'Revoyez cette notion dans sa leçon.'}</T> : <Btn title="Voir la réponse" onPress={() => setShown(true)} />}
      </Card>
      {shown && (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Btn style={{ flex: 1 }} title="À revoir" onPress={() => { gradeCard(card.key, 'again'); setShown(false); setI(i + 1); }} />
          <Btn style={{ flex: 1 }} variant="primary" title="Je savais" onPress={() => { gradeCard(card.key, 'good'); setShown(false); setI(i + 1); }} />
        </View>
      )}
    </ScrollView>
  );
}

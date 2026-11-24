import { dueQueue, isCompleted } from '@coran/core';
import { router } from 'expo-router';
import { ScrollView } from 'react-native';
import { Btn, Card, Progress, s, T } from '../../components/ui';
import { CATALOG } from '../../lib/content';
import { useStore } from '../../lib/store';

export default function Home() {
  const { progress, cards, premium, session } = useStore();
  const free = CATALOG.filter((m) => m.tier === 'free').flatMap((m) => m.lessons);
  const done = free.filter((l) => isCompleted(progress[l.id])).length;
  const next = CATALOG.filter((m) => m.tier === 'free' || premium).flatMap((m) => m.lessons).find((l) => !isCompleted(progress[l.id]));
  const due = dueQueue(cards);
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      {!session && <Card tone="soft"><T size={14}>Mode découverte : progression gardée sur cet appareil. Créez un compte pour la sauvegarder.</T><Btn title="Créer un compte" onPress={() => router.push('/auth')} /></Card>}
      {next ? (
        <Card tone="accent">
          <T size={13} muted>Module {next.moduleId}</T>
          <T size={20} bold>{next.title}</T>
          <Progress value={free.length ? done / free.length : 0} />
          <T size={13} muted>Parcours gratuit : {Math.round((done / Math.max(1, free.length)) * 100)} %</T>
          <Btn variant="primary" title={progress[next.id] ? 'Reprendre ma leçon' : 'Commencer la leçon'} onPress={() => router.push(`/lesson/${next.id}`)} />
        </Card>
      ) : (
        <Card tone="gold"><T bold>Parcours gratuit terminé</T>{!premium && <Btn variant="primary" title="Découvrir la conjugaison" onPress={() => router.push('/premium')} />}</Card>
      )}
      <Card>
        <T bold>Révisions prioritaires : {due.length}</T>
        {due.length ? <Btn title="Réviser maintenant" onPress={() => router.push('/review')} /> : <T size={14} muted>Rien à réviser pour l’instant.</T>}
      </Card>
    </ScrollView>
  );
}

import { isCompleted } from '@coran/core';
import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { C, Card, Progress, s, T } from '../../components/ui';
import { CATALOG } from '../../lib/content';
import { useStore } from '../../lib/store';

export default function Learn() {
  const { progress, premium } = useStore();
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      {CATALOG.map((m, i) => {
        const done = m.lessons.filter((l) => isCompleted(progress[l.id])).length;
        const locked = m.tier === 'premium' && !premium;
        return (
          <View key={m.id} style={{ gap: 8 }}>
            {m.tier === 'premium' && CATALOG[i - 1]?.tier === 'free' && <T bold style={{ color: C.goldInk, textAlign: 'center' }}>— Fin du parcours gratuit —</T>}
            <Card tone={locked ? 'gold' : done === m.lessons.length ? 'soft' : undefined}>
              <T bold>Module {m.id} · {m.title}{locked ? '  · Premium' : ''}</T>
              <T size={13} muted>{m.subtitle}</T>
              <Progress value={m.lessons.length ? done / m.lessons.length : 0} />
              {m.lessons.map((l) => (
                <Pressable key={l.id} accessibilityRole="button" onPress={() => router.push(locked ? '/premium' : `/lesson/${l.id}`)} style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.border }}>
                  <T>{isCompleted(progress[l.id]) ? '✓ ' : ''}{l.title}</T>
                </Pressable>
              ))}
            </Card>
          </View>
        );
      })}
    </ScrollView>
  );
}

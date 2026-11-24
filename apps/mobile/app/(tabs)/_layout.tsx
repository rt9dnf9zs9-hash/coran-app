import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { C } from '../../components/ui';

const icon = (glyph: string) => ({ color }: { color: string }) => <Text style={{ color, fontSize: 18 }} accessibilityElementsHidden>{glyph}</Text>;

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: C.primary, tabBarInactiveTintColor: C.muted, headerTintColor: C.ink, sceneStyle: { backgroundColor: C.bg } }}>
      <Tabs.Screen name="index" options={{ title: 'Accueil', tabBarIcon: icon('⌂') }} />
      <Tabs.Screen name="learn" options={{ title: 'Apprendre', tabBarIcon: icon('▤') }} />
      <Tabs.Screen name="review" options={{ title: 'Révisions', tabBarIcon: icon('↻') }} />
      <Tabs.Screen name="progress" options={{ title: 'Progression', tabBarIcon: icon('▥') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: icon('◉') }} />
    </Tabs>
  );
}

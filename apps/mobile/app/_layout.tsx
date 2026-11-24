import { Amiri_400Regular, useFonts } from '@expo-google-fonts/amiri';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { C } from '../components/ui';
import { StoreProvider } from '../lib/store';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Amiri_400Regular });
  if (!fontsLoaded) return <View style={{ flex: 1, justifyContent: 'center', backgroundColor: C.bg }}><ActivityIndicator color={C.primary} /></View>;
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerTintColor: C.primary, contentStyle: { backgroundColor: C.bg }, headerBackTitle: 'Retour' }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="lesson/[id]" options={{ title: 'Leçon' }} />
          <Stack.Screen name="premium" options={{ title: 'Premium', presentation: 'modal' }} />
          <Stack.Screen name="auth" options={{ title: 'Compte' }} />
        </Stack>
      </StoreProvider>
    </SafeAreaProvider>
  );
}

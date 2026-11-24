import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, Linking, Platform, ScrollView, TextInput, View } from 'react-native';
import { Ar, Btn, C, Card, s, T } from '../../components/ui';
import { restore } from '../../lib/purchases';
import { useStore } from '../../lib/store';
import { supabase } from '../../lib/supabase';

export default function Profile() {
  const { session, premium, signOut, refreshEntitlement, arabicScale, setArabicScale } = useStore();
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  async function deleteAccount() {
    if (confirm !== 'SUPPRIMER') return Alert.alert('Confirmation', 'Tapez SUPPRIMER pour confirmer.');
    setBusy(true);
    const { data, error } = await supabase!.functions.invoke('delete-account', { body: { confirm: 'SUPPRIMER' } });
    setBusy(false);
    if (error) return Alert.alert('Erreur', 'La suppression a échoué. Réessayez.');
    await signOut();
    Alert.alert('Compte supprimé', (data?.store_subscriptions_to_cancel ?? []).length ? 'Pensez à résilier votre abonnement dans les réglages de votre boutique.' : 'Vos données ont été supprimées.');
  }

  const manage = () => Linking.openURL(Platform.OS === 'ios' ? 'https://apps.apple.com/account/subscriptions' : 'https://play.google.com/store/account/subscriptions');

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Card>
        <T bold>Compte</T>
        {session ? <T>{session.user.email}</T> : <Btn variant="primary" title="Se connecter ou créer un compte" onPress={() => router.push('/auth')} />}
      </Card>
      {session && (
        <Card>
          <T bold>Abonnement</T>
          <T>{premium ? 'Premium actif' : 'Parcours gratuit (modules 1 à 5)'}</T>
          {premium ? <Btn title="Gérer ou résilier" onPress={manage} /> : <Btn variant="primary" title="Voir l’offre Premium" onPress={() => router.push('/premium')} />}
          <Btn title="Restaurer mes achats" onPress={async () => { await restore().catch(() => undefined); const p = await refreshEntitlement(); Alert.alert('Restauration', p ? 'Abonnement Premium retrouvé.' : 'Aucun abonnement actif trouvé pour ce compte. Si vous venez d’acheter, patientez quelques secondes.'); }} />
        </Card>
      )}
      <Card>
        <T bold>Taille du texte arabe</T>
        <Ar>كِتَابٌ</Ar>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Btn title="A−" onPress={() => setArabicScale(Math.max(1, arabicScale - 0.2))} />
          <Btn title="A+" onPress={() => setArabicScale(Math.min(2.6, arabicScale + 0.2))} />
        </View>
      </Card>
      <Card>
        <Btn title="Confidentialité" onPress={() => WebBrowser.openBrowserAsync(`${process.env.EXPO_PUBLIC_WEB_URL ?? ''}#/confidentialite`)} />
      </Card>
      {session && (
        <Card tone="err">
          <Btn title="Se déconnecter" onPress={() => signOut()} />
          <T size={14} style={{ color: C.errorInk }}>Suppression définitive du compte et de la progression. Un abonnement App Store / Google Play doit être résilié dans la boutique.</T>
          <TextInput value={confirm} onChangeText={setConfirm} placeholder="Tapez SUPPRIMER" autoCapitalize="characters" accessibilityLabel="Confirmation de suppression" style={{ borderWidth: 1, borderColor: C.border, borderRadius: 12, minHeight: 48, paddingHorizontal: 12, backgroundColor: '#fff' }} />
          <Btn variant="danger" busy={busy} title="Supprimer mon compte" onPress={deleteAccount} />
        </Card>
      )}
    </ScrollView>
  );
}

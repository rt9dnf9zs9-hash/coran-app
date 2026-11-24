import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';
import { Btn, Card, s, T } from '../components/ui';
import { annualPackage, buy, purchasesAvailable, restore } from '../lib/purchases';
import { useStore } from '../lib/store';

export default function Premium() {
  const { session, premium, refreshEntitlement } = useStore();
  const [pkg, setPkg] = useState<PurchasesPackage | null>(null);
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);

  useEffect(() => { if (session) annualPackage().then(setPkg).catch(() => setPkg(null)); }, [session]);

  // Après achat : on attend que le webhook RevenueCat ait mis à jour le serveur.
  useEffect(() => {
    if (!waiting) return;
    let n = 0;
    const t = setInterval(async () => {
      n++;
      if (await refreshEntitlement()) { clearInterval(t); setWaiting(false); }
      if (n > 30) { clearInterval(t); setWaiting(false); Alert.alert('Confirmation en attente', 'Votre achat est en cours de confirmation. L’accès s’activera automatiquement.'); }
    }, 2000);
    return () => clearInterval(t);
  }, [waiting, refreshEntitlement]);

  if (premium) return <ScrollView style={s.screen} contentContainerStyle={s.content}><Card tone="soft"><T bold>Premium actif</T><Btn variant="primary" title="Commencer le module 6" onPress={() => router.replace('/lesson/m6l1')} /></Card></ScrollView>;

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <T size={22} bold>Prochaine étape : la conjugaison</T>
      <Card>
        <T>✓ Module 6 — Conjugaison</T><T>✓ Module 7 — Grammaire approfondie</T><T>✓ Module 8 — Analyse de versets</T><T>✓ Exercices et audios avancés</T>
      </Card>
      <Card tone="gold">
        <T size={22} bold>{pkg ? `${pkg.product.priceString} / an` : 'Prix affiché par la boutique'}</T>
        <T size={14}>Abonnement annuel à renouvellement automatique, géré par l’App Store ou Google Play. Résiliable à tout moment dans les réglages de la boutique ; l’accès reste ouvert jusqu’à la fin de la période payée. Les modules 1 à 5 restent gratuits.</T>
      </Card>
      {!session ? <Btn variant="primary" title="Créer un compte pour s’abonner" onPress={() => router.push('/auth')} />
        : !purchasesAvailable() ? <Card><T size={14}>Les achats intégrés ne sont pas configurés dans cette version.</T></Card>
        : <Btn variant="primary" busy={busy || waiting} disabled={!pkg} title="S’abonner pour un an" onPress={async () => {
            setBusy(true);
            try { if ((await buy(pkg!)) === 'purchased') setWaiting(true); }
            catch { Alert.alert('Paiement', 'L’achat n’a pas abouti. Aucun montant n’a été prélevé.'); }
            finally { setBusy(false); }
          }} />}
      {session && purchasesAvailable() && <Btn title="Restaurer mes achats" onPress={async () => { await restore().catch(() => undefined); setWaiting(true); }} />}
      <Btn title="Continuer le parcours gratuit" onPress={() => router.back()} />
    </ScrollView>
  );
}

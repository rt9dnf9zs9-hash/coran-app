// Achats intégrés (App Store / Google Play) via RevenueCat.
// Le droit Premium n'est jamais accordé par l'app : le webhook RevenueCat met à jour Supabase,
// puis l'app relit my_entitlement().
import { Platform } from 'react-native';
import Purchases, { type PurchasesPackage } from 'react-native-purchases';

const KEY = Platform.select({ ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY, android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY });
let configured = false;

export function purchasesAvailable(): boolean {
  return !!KEY;
}

/** À appeler après connexion : l'identifiant RevenueCat = identifiant Supabase. */
export async function configurePurchases(userId: string): Promise<void> {
  if (!KEY) return;
  if (!configured) {
    Purchases.configure({ apiKey: KEY, appUserID: userId });
    configured = true;
  } else {
    await Purchases.logIn(userId);
  }
}

export async function logoutPurchases(): Promise<void> {
  if (configured) await Purchases.logOut().catch(() => undefined);
}

/** Offre annuelle configurée dans RevenueCat (prix localisé fourni par la boutique). */
export async function annualPackage(): Promise<PurchasesPackage | null> {
  if (!configured) return null;
  const offerings = await Purchases.getOfferings();
  return offerings.current?.annual ?? offerings.current?.availablePackages[0] ?? null;
}

export async function buy(pkg: PurchasesPackage): Promise<'purchased' | 'cancelled'> {
  try {
    await Purchases.purchasePackage(pkg);
    return 'purchased';
  } catch (e) {
    if ((e as { userCancelled?: boolean }).userCancelled) return 'cancelled';
    throw e;
  }
}

export async function restore(): Promise<void> {
  if (configured) await Purchases.restorePurchases();
}

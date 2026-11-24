// Traduction des événements Stripe et RevenueCat en lignes de la table subscriptions.
// Fonctions pures : testées dans supabase/functions/_shared/test.

export type SubStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired' | 'refunded' | 'revoked' | 'incomplete';

export interface SubscriptionRow {
  user_id: string;
  provider: 'stripe' | 'app_store' | 'play_store';
  provider_ref: string;
  product_id: string | null;
  status: SubStatus;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

const iso = (sec?: number | null) => (sec ? new Date(sec * 1000).toISOString() : null);

// deno-lint-ignore no-explicit-any
type Json = any;

export function mapStripeStatus(s: string): SubStatus {
  switch (s) {
    case 'active': return 'active';
    case 'trialing': return 'trialing';
    case 'past_due': return 'past_due';
    case 'canceled': return 'canceled';
    case 'incomplete': return 'incomplete';
    case 'unpaid':
    case 'incomplete_expired':
    case 'paused':
    default: return 'expired';
  }
}

/** Objet Subscription Stripe → ligne. user_id vient des métadonnées posées au Checkout. */
export function fromStripeSubscription(sub: Json, fallbackUserId?: string | null): SubscriptionRow | null {
  const userId: string | undefined = sub?.metadata?.user_id ?? fallbackUserId ?? undefined;
  if (!userId || !sub?.id) return null;
  const item = sub.items?.data?.[0];
  // Selon la version d'API, la fin de période est sur l'abonnement ou sur l'élément.
  const periodEnd: number | undefined = sub.current_period_end ?? item?.current_period_end;
  return {
    user_id: userId,
    provider: 'stripe',
    provider_ref: sub.id,
    product_id: item?.price?.id ?? null,
    status: mapStripeStatus(sub.status),
    current_period_end: iso(periodEnd),
    cancel_at_period_end: Boolean(sub.cancel_at_period_end),
  };
}

export type RevenueCatAction =
  | { kind: 'upsert'; row: SubscriptionRow }
  | { kind: 'ignore'; reason: string };

/** Événement webhook RevenueCat (app_user_id = id Supabase, voir Purchases.logIn). */
export function fromRevenueCatEvent(event: Json): RevenueCatAction {
  const type: string = event?.type ?? '';
  const store: string = event?.store ?? '';
  const provider = store === 'APP_STORE' || store === 'MAC_APP_STORE' ? 'app_store' : store === 'PLAY_STORE' ? 'play_store' : null;
  if (!provider) return { kind: 'ignore', reason: `boutique non gérée : ${store || 'inconnue'}` };
  if (type === 'TEST') return { kind: 'ignore', reason: 'événement de test' };
  const userId: string | undefined = event.app_user_id;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!userId || !uuid.test(userId)) return { kind: 'ignore', reason: 'app_user_id anonyme ou invalide' };
  const ref: string | undefined = event.original_transaction_id ?? event.transaction_id;
  if (!ref) return { kind: 'ignore', reason: 'transaction absente' };
  const expires = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null;
  const base = { user_id: userId, provider, provider_ref: ref, product_id: event.product_id ?? null, current_period_end: expires } as const;
  switch (type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'PRODUCT_CHANGE':
    case 'UNCANCELLATION':
    case 'SUBSCRIPTION_EXTENDED':
      return { kind: 'upsert', row: { ...base, status: event.period_type === 'TRIAL' ? 'trialing' : 'active', cancel_at_period_end: false } };
    case 'CANCELLATION':
      // Remboursement par le support de la boutique : accès retiré immédiatement.
      if (event.cancel_reason === 'CUSTOMER_SUPPORT') return { kind: 'upsert', row: { ...base, status: 'refunded', cancel_at_period_end: true } };
      // Résiliation simple : accès conservé jusqu'à la fin de la période payée.
      return { kind: 'upsert', row: { ...base, status: 'active', cancel_at_period_end: true } };
    case 'BILLING_ISSUE':
      return { kind: 'upsert', row: { ...base, status: 'past_due', cancel_at_period_end: false } };
    case 'EXPIRATION':
      return { kind: 'upsert', row: { ...base, status: 'expired', cancel_at_period_end: true } };
    default:
      return { kind: 'ignore', reason: `type non géré : ${type}` };
  }
}

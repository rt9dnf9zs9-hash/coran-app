// Webhook Stripe : SEULE source qui accorde ou retire le Premium web.
// Déploiement : supabase functions deploy stripe-webhook --no-verify-jwt
import { adminClient, env } from '../_shared/http.ts';
import { stripe } from '../_shared/stripe-api.ts';
import { SignatureError, verifyStripeSignature } from '../_shared/stripe-signature.ts';
import { fromStripeSubscription } from '../_shared/subscription-mapping.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const raw = await req.text();
  try {
    await verifyStripeSignature(raw, req.headers.get('Stripe-Signature'), env('STRIPE_WEBHOOK_SECRET'));
  } catch (e) {
    if (e instanceof SignatureError) return new Response('Invalid signature', { status: 400 });
    throw e;
  }
  const event = JSON.parse(raw);
  const db = adminClient();

  // Idempotence : un même événement n'est traité qu'une fois.
  const { data: existing } = await db.from('payment_events').select('id, processed_at').eq('provider', 'stripe').eq('event_id', event.id).maybeSingle();
  if (existing?.processed_at) return new Response(JSON.stringify({ duplicate: true }), { status: 200 });
  if (!existing) {
    const { error } = await db.from('payment_events').insert({ provider: 'stripe', event_id: event.id, type: event.type, payload: event });
    if (error && !String(error.message).includes('duplicate')) throw error;
  }

  try {
    await handle(event, db);
    await db.from('payment_events').update({ processed_at: new Date().toISOString(), error: null }).eq('provider', 'stripe').eq('event_id', event.id);
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (e) {
    console.error('stripe-webhook', event.type, e);
    await db.from('payment_events').update({ error: String(e).slice(0, 500) }).eq('provider', 'stripe').eq('event_id', event.id);
    // 500 → Stripe renverra l'événement plus tard.
    return new Response('Processing error', { status: 500 });
  }
});

// deno-lint-ignore no-explicit-any
async function userIdForCustomer(db: any, customerId: string): Promise<string | null> {
  const { data } = await db.from('billing_customers').select('user_id').eq('stripe_customer_id', customerId).maybeSingle();
  return data?.user_id ?? null;
}

// deno-lint-ignore no-explicit-any
async function upsertFromSubscription(db: any, sub: any) {
  const row = fromStripeSubscription(sub, await userIdForCustomer(db, sub.customer));
  if (!row) throw new Error(`Abonnement ${sub.id} sans utilisateur associé`);
  const { error } = await db.from('subscriptions').upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'provider,provider_ref' });
  if (error) throw error;
}

// deno-lint-ignore no-explicit-any
async function handle(event: any, db: any) {
  const obj = event.data.object;
  switch (event.type) {
    case 'checkout.session.completed': {
      if (obj.mode !== 'subscription' || !obj.subscription) return;
      // On relit l'abonnement chez Stripe (source de vérité), on ne se fie pas au retour navigateur.
      const sub = await stripe('GET', `subscriptions/${obj.subscription}`);
      await upsertFromSubscription(db, sub);
      return;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
    case 'customer.subscription.paused':
    case 'customer.subscription.resumed': {
      // L'événement peut arriver dans le désordre : on relit l'état courant.
      const sub = await stripe('GET', `subscriptions/${obj.id}`);
      await upsertFromSubscription(db, sub);
      return;
    }
    case 'invoice.payment_failed':
    case 'invoice.paid': {
      const subId = obj.subscription ?? obj.parent?.subscription_details?.subscription;
      if (subId) await upsertFromSubscription(db, await stripe('GET', `subscriptions/${subId}`));
      return;
    }
    case 'charge.refunded': {
      // Remboursement total : retrait immédiat de l'accès et arrêt de l'abonnement.
      if (!obj.refunded || obj.amount_refunded < obj.amount) return;
      const userId = await userIdForCustomer(db, obj.customer);
      if (!userId) return;
      const { data: subs } = await db.from('subscriptions').select('provider_ref').eq('user_id', userId).eq('provider', 'stripe').in('status', ['active', 'trialing', 'past_due']);
      for (const s of subs ?? []) {
        await stripe('DELETE', `subscriptions/${s.provider_ref}`).catch((e: unknown) => console.error('cancel after refund', e));
        await db.from('subscriptions').update({ status: 'refunded', updated_at: new Date().toISOString() }).eq('provider', 'stripe').eq('provider_ref', s.provider_ref);
      }
      return;
    }
    default:
      return; // événement non utilisé : enregistré, sans effet
  }
}

// Webhook RevenueCat : achats intégrés App Store / Google Play.
// Déploiement : supabase functions deploy revenuecat-webhook --no-verify-jwt
// Dans RevenueCat > Integrations > Webhooks, définir l'en-tête Authorization = REVENUECAT_WEBHOOK_AUTH.
import { adminClient, env } from '../_shared/http.ts';
import { safeEqual } from '../_shared/stripe-signature.ts';
import { fromRevenueCatEvent } from '../_shared/subscription-mapping.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const expected = `Bearer ${env('REVENUECAT_WEBHOOK_AUTH')}`;
  if (!safeEqual(req.headers.get('Authorization') ?? '', expected)) return new Response('Unauthorized', { status: 401 });

  const body = await req.json();
  const event = body?.event;
  if (!event?.id) return new Response('Bad request', { status: 400 });
  const db = adminClient();

  const { data: existing } = await db.from('payment_events').select('processed_at').eq('provider', 'revenuecat').eq('event_id', event.id).maybeSingle();
  if (existing?.processed_at) return new Response(JSON.stringify({ duplicate: true }), { status: 200 });
  if (!existing) await db.from('payment_events').insert({ provider: 'revenuecat', event_id: event.id, type: event.type, payload: body });

  const action = fromRevenueCatEvent(event);
  if (action.kind === 'upsert') {
    const { error } = await db.from('subscriptions').upsert({ ...action.row, updated_at: new Date().toISOString() }, { onConflict: 'provider,provider_ref' });
    if (error) {
      await db.from('payment_events').update({ error: error.message }).eq('provider', 'revenuecat').eq('event_id', event.id);
      return new Response('Processing error', { status: 500 });
    }
  }
  await db.from('payment_events').update({ processed_at: new Date().toISOString(), error: action.kind === 'ignore' ? action.reason : null }).eq('provider', 'revenuecat').eq('event_id', event.id);
  return new Response(JSON.stringify({ received: true }), { status: 200 });
});

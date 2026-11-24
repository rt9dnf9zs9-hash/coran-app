// Crée une session Stripe Checkout pour l'abonnement annuel.
// Le statut Premium n'est JAMAIS accordé ici : seul le webhook Stripe l'accorde.
import { adminClient, env, handler, HttpError, json, requireUser } from '../_shared/http.ts';
import { stripe } from '../_shared/stripe-api.ts';

Deno.serve(handler(async (req) => {
  const user = await requireUser(req);
  const db = adminClient();

  const { data: premium } = await db.rpc('has_premium', { uid: user.id });
  if (premium) throw new HttpError(409, 'already_premium', 'Votre abonnement Premium est déjà actif.');

  const { data: setting } = await db.from('app_settings').select('value').eq('key', 'premium_price').single();
  const priceId: string | null = setting?.value?.stripe_price_id ?? null;
  if (!priceId) throw new HttpError(503, 'price_not_configured', 'L’abonnement n’est pas encore disponible. Revenez bientôt.');

  // Client Stripe unique par utilisateur
  let { data: customer } = await db.from('billing_customers').select('stripe_customer_id').eq('user_id', user.id).maybeSingle();
  if (!customer) {
    const created = await stripe('POST', 'customers', { email: user.email ?? undefined, 'metadata[user_id]': user.id }, `customer-${user.id}`);
    await db.from('billing_customers').insert({ user_id: user.id, stripe_customer_id: created.id });
    customer = { stripe_customer_id: created.id };
  }

  const appUrl = env('APP_PUBLIC_URL').replace(/\/?$/, '/');
  const session = await stripe('POST', 'checkout/sessions', {
    mode: 'subscription',
    customer: customer.stripe_customer_id,
    client_reference_id: user.id,
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': 1,
    'subscription_data[metadata][user_id]': user.id,
    'metadata[user_id]': user.id,
    allow_promotion_codes: false,
    locale: 'fr',
    // Renonciation au droit de rétractation pour un contenu numérique fourni immédiatement :
    // le texte est affiché sur la page de paiement (à valider par un juriste).
    'custom_text[submit][message]': 'En vous abonnant, vous demandez l’accès immédiat au contenu Premium et reconnaissez perdre votre droit de rétractation de 14 jours une fois l’accès commencé. Renouvellement automatique chaque année, résiliable à tout moment.',
    success_url: `${appUrl}#/premium/succes?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}#/premium/annule`,
  });
  return json({ url: session.url });
}));

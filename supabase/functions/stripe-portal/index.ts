// Ouvre le portail client Stripe : facture, moyen de paiement, résiliation en quelques clics.
import { adminClient, env, handler, HttpError, json, requireUser } from '../_shared/http.ts';
import { stripe } from '../_shared/stripe-api.ts';

Deno.serve(handler(async (req) => {
  const user = await requireUser(req);
  const { data: customer } = await adminClient().from('billing_customers').select('stripe_customer_id').eq('user_id', user.id).maybeSingle();
  if (!customer) throw new HttpError(404, 'no_web_subscription', 'Aucun abonnement web n’est associé à ce compte.');
  const session = await stripe('POST', 'billing_portal/sessions', {
    customer: customer.stripe_customer_id,
    return_url: `${env('APP_PUBLIC_URL').replace(/\/?$/, '/')}#/profil`,
    locale: 'fr',
  });
  return json({ url: session.url });
}));

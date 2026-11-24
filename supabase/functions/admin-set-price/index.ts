// Modifie le prix annuel sans toucher au code : crée un nouveau prix Stripe et met à jour app_settings.
// Les abonnés existants gardent leur prix (comportement Stripe) jusqu'à ce que vous les migriez.
import { adminClient, handler, HttpError, json, requireUser } from '../_shared/http.ts';
import { stripe } from '../_shared/stripe-api.ts';

Deno.serve(handler(async (req) => {
  const user = await requireUser(req);
  const { data: isAdmin } = await user.client.rpc('is_admin');
  if (!isAdmin) throw new HttpError(403, 'forbidden', 'Accès réservé aux administrateurs.');

  const { amount_cents } = await req.json();
  if (!Number.isInteger(amount_cents) || amount_cents < 100 || amount_cents > 100_000) {
    throw new HttpError(400, 'invalid_amount', 'Le prix doit être compris entre 1 € et 1 000 €.');
  }
  const db = adminClient();
  const { data: setting } = await db.from('app_settings').select('value').eq('key', 'premium_price').single();
  const current = setting?.value ?? {};

  let productId: string | undefined = current.stripe_product_id;
  if (!productId) {
    const product = await stripe('POST', 'products', { name: 'Premium annuel — Arabe coranique', 'metadata[app]': 'coran-app' });
    productId = product.id;
  }
  const price = await stripe('POST', 'prices', {
    product: productId,
    unit_amount: amount_cents,
    currency: 'eur',
    'recurring[interval]': 'year',
    tax_behavior: 'inclusive',
  });
  const display = `${(amount_cents / 100).toFixed(2).replace('.', ',')} €`;
  const value = { ...current, amount_cents, currency: 'eur', interval: 'year', display, stripe_price_id: price.id, stripe_product_id: productId };
  const { error } = await db.from('app_settings').update({ value, updated_by: user.id, updated_at: new Date().toISOString() }).eq('key', 'premium_price');
  if (error) throw error;
  await db.from('audit_log').insert({ actor: user.id, action: 'set_price', entity: 'app_settings', entity_id: 'premium_price', details: { amount_cents, price_id: price.id } });
  return json({ ok: true, value });
}));

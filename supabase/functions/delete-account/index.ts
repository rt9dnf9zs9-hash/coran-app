// Suppression du compte : résilie l'abonnement web, puis supprime l'utilisateur
// (toutes ses données sont supprimées en cascade). Les journaux de paiement sont
// conservés pour les obligations comptables (voir docs/SECURITE_ET_DONNEES.md).
import { adminClient, handler, HttpError, json, requireUser } from '../_shared/http.ts';
import { stripe } from '../_shared/stripe-api.ts';

Deno.serve(handler(async (req) => {
  const user = await requireUser(req);
  const { confirm } = await req.json().catch(() => ({}));
  if (confirm !== 'SUPPRIMER') throw new HttpError(400, 'confirmation_required', 'Tapez SUPPRIMER pour confirmer.');
  const db = adminClient();

  const { data: subs } = await db.from('subscriptions').select('provider, provider_ref, status').eq('user_id', user.id).in('status', ['active', 'trialing', 'past_due']);
  for (const s of subs ?? []) {
    if (s.provider === 'stripe') await stripe('DELETE', `subscriptions/${s.provider_ref}`);
  }
  const storeSubs = (subs ?? []).filter((s) => s.provider !== 'stripe');

  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) throw error;
  return json({
    ok: true,
    // Les abonnements Apple / Google ne peuvent être résiliés que par l'utilisateur dans sa boutique.
    store_subscriptions_to_cancel: storeSubs.map((s) => s.provider),
  });
}));

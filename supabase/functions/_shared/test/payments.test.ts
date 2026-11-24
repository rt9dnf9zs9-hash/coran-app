import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hmacSha256Hex, SignatureError, verifyStripeSignature } from '../stripe-signature.ts';
import { fromRevenueCatEvent, fromStripeSubscription, mapStripeStatus } from '../subscription-mapping.ts';

const secret = 'whsec_test_secret';
const body = JSON.stringify({ id: 'evt_1', type: 'customer.subscription.updated' });

test('signature Stripe valide acceptée', async () => {
  const t = 1_800_000_000;
  const sig = await hmacSha256Hex(secret, `${t}.${body}`);
  await verifyStripeSignature(body, `t=${t},v1=${sig}`, secret, 300, t + 10);
});

test('signature Stripe falsifiée refusée', async () => {
  const t = 1_800_000_000;
  await assert.rejects(verifyStripeSignature(body, `t=${t},v1=${'0'.repeat(64)}`, secret, 300, t), SignatureError);
});

test('corps modifié refusé', async () => {
  const t = 1_800_000_000;
  const sig = await hmacSha256Hex(secret, `${t}.${body}`);
  await assert.rejects(verifyStripeSignature(body.replace('updated', 'deleted'), `t=${t},v1=${sig}`, secret, 300, t), SignatureError);
});

test('rejeu d’un ancien événement refusé', async () => {
  const t = 1_800_000_000;
  const sig = await hmacSha256Hex(secret, `${t}.${body}`);
  await assert.rejects(verifyStripeSignature(body, `t=${t},v1=${sig}`, secret, 300, t + 3600), /tolérance/);
});

test('en-tête absent refusé', async () => {
  await assert.rejects(verifyStripeSignature(body, null, secret), SignatureError);
});

test('statuts Stripe : impayé = plus d’accès', () => {
  assert.equal(mapStripeStatus('active'), 'active');
  assert.equal(mapStripeStatus('past_due'), 'past_due');
  assert.equal(mapStripeStatus('unpaid'), 'expired');
  assert.equal(mapStripeStatus('incomplete_expired'), 'expired');
  assert.equal(mapStripeStatus('canceled'), 'canceled');
});

test('abonnement Stripe → ligne (fin de période sur l’abonnement ou sur l’élément)', () => {
  const uid = '11111111-1111-1111-1111-111111111111';
  const a = fromStripeSubscription({ id: 'sub_1', status: 'active', current_period_end: 1_900_000_000, cancel_at_period_end: false, metadata: { user_id: uid }, items: { data: [{ price: { id: 'price_1' } }] } });
  assert.equal(a?.status, 'active');
  assert.equal(a?.current_period_end, new Date(1_900_000_000_000).toISOString());
  const b = fromStripeSubscription({ id: 'sub_2', status: 'active', cancel_at_period_end: true, metadata: {}, items: { data: [{ current_period_end: 1_900_000_000, price: { id: 'p' } }] } }, uid);
  assert.equal(b?.user_id, uid);
  assert.equal(b?.cancel_at_period_end, true);
  assert.equal(fromStripeSubscription({ id: 'sub_3', status: 'active', metadata: {} }), null, 'sans utilisateur : ignoré');
});

const uid = '22222222-2222-2222-2222-222222222222';
const rc = (type: string, extra: Record<string, unknown> = {}) => ({ type, store: 'APP_STORE', app_user_id: uid, original_transaction_id: 'otx1', product_id: 'premium_annual', expiration_at_ms: 1_900_000_000_000, ...extra });

test('RevenueCat : achat, résiliation, remboursement, expiration', () => {
  const buy = fromRevenueCatEvent(rc('INITIAL_PURCHASE'));
  assert.equal(buy.kind === 'upsert' && buy.row.status, 'active');
  const cancel = fromRevenueCatEvent(rc('CANCELLATION', { cancel_reason: 'UNSUBSCRIBE' }));
  assert.ok(cancel.kind === 'upsert' && cancel.row.status === 'active' && cancel.row.cancel_at_period_end, 'résiliation : accès jusqu’à la fin de période');
  const refund = fromRevenueCatEvent(rc('CANCELLATION', { cancel_reason: 'CUSTOMER_SUPPORT' }));
  assert.equal(refund.kind === 'upsert' && refund.row.status, 'refunded');
  const exp = fromRevenueCatEvent(rc('EXPIRATION'));
  assert.equal(exp.kind === 'upsert' && exp.row.status, 'expired');
  const issue = fromRevenueCatEvent(rc('BILLING_ISSUE', { store: 'PLAY_STORE' }));
  assert.ok(issue.kind === 'upsert' && issue.row.status === 'past_due' && issue.row.provider === 'play_store');
});

test('RevenueCat : utilisateur anonyme ou boutique inconnue ignorés', () => {
  assert.equal(fromRevenueCatEvent(rc('INITIAL_PURCHASE', { app_user_id: '$RCAnonymousID:abc' })).kind, 'ignore');
  assert.equal(fromRevenueCatEvent(rc('INITIAL_PURCHASE', { store: 'STRIPE' })).kind, 'ignore');
  assert.equal(fromRevenueCatEvent(rc('TEST')).kind, 'ignore');
});

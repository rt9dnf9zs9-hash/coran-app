// Vérification de la signature des webhooks Stripe (en-tête Stripe-Signature).
// Sans dépendance : fonctionne sous Deno (Edge Functions) et Node 20+ (tests).

const enc = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Comparaison à temps constant. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toHex(await crypto.subtle.sign('HMAC', key, enc.encode(payload)));
}

export class SignatureError extends Error {}

export async function verifyStripeSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  toleranceSec = 300,
  nowSec = Math.floor(Date.now() / 1000),
): Promise<void> {
  if (!header) throw new SignatureError('En-tête Stripe-Signature absent');
  const parts = header.split(',').map((p) => p.trim().split('='));
  const t = parts.find(([k]) => k === 't')?.[1];
  const sigs = parts.filter(([k]) => k === 'v1').map(([, v]) => v ?? '');
  if (!t || sigs.length === 0) throw new SignatureError('En-tête Stripe-Signature invalide');
  const ts = Number(t);
  if (!Number.isFinite(ts) || Math.abs(nowSec - ts) > toleranceSec) throw new SignatureError('Horodatage hors tolérance (rejeu possible)');
  const expected = await hmacSha256Hex(secret, `${t}.${rawBody}`);
  if (!sigs.some((s) => safeEqual(s, expected))) throw new SignatureError('Signature invalide');
}

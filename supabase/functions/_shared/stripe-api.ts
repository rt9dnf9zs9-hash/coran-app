// Appels à l'API Stripe en REST (pas de SDK nécessaire). Clé secrète lue côté serveur uniquement.
import { env, HttpError } from './http.ts';

type Params = Record<string, string | number | boolean | undefined | null>;

function form(params: Params): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) sp.append(k, String(v));
  return sp.toString();
}

// deno-lint-ignore no-explicit-any
export async function stripe(method: 'GET' | 'POST' | 'DELETE', path: string, params: Params = {}, idempotencyKey?: string): Promise<any> {
  const url = `https://api.stripe.com/v1/${path}${method === 'GET' && Object.keys(params).length ? `?${form(params)}` : ''}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${env('STRIPE_SECRET_KEY')}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  const res = await fetch(url, { method, headers, body: method === 'GET' ? undefined : form(params) });
  const data = await res.json();
  if (!res.ok) {
    console.error('Stripe', res.status, data?.error?.type, data?.error?.code);
    throw new HttpError(502, 'payment_provider_error', 'Le service de paiement est momentanément indisponible. Réessayez.');
  }
  return data;
}

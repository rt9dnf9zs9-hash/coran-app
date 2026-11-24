// Utilitaires communs aux Edge Functions (Deno).
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const ALLOWED_ORIGIN = Deno.env.get('APP_ORIGIN') ?? '*';

export const cors = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

/** Message d'erreur compréhensible, sans détail technique exposé. */
export function fail(status: number, code: string, message: string): Response {
  return json({ error: { code, message } }, status);
}

export function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Variable d'environnement manquante : ${name}`);
  return v;
}

/** Client « service_role » : contourne RLS. À n'utiliser que côté serveur. */
export function adminClient(): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
}

/** Vérifie le jeton de l'utilisateur et renvoie son identité. */
export async function requireUser(req: Request): Promise<{ id: string; email: string | null; client: SupabaseClient }> {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) throw new HttpError(401, 'not_authenticated', 'Connectez-vous pour continuer.');
  const client = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new HttpError(401, 'session_expired', 'Votre session a expiré. Reconnectez-vous.');
  return { id: data.user.id, email: data.user.email ?? null, client };
}

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export function handler(fn: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
    if (req.method !== 'POST') return fail(405, 'method_not_allowed', 'Méthode non autorisée.');
    try {
      return await fn(req);
    } catch (e) {
      if (e instanceof HttpError) return fail(e.status, e.code, e.message);
      console.error(e);
      return fail(500, 'server_error', 'Une erreur est survenue. Réessayez dans quelques instants.');
    }
  };
}

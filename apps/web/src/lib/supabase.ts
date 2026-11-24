import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** null si le backend n'est pas configuré : l'application fonctionne alors en mode découverte local. */
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;

export const backendConfigured = supabase !== null;

/** URL publique de l'app (avec chemin de base GitHub Pages), pour les redirections d'e-mail. */
export function appUrl(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL ?? '/'}`;
}

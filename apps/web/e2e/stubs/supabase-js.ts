// Stub de test : en mode « backend non configuré », createClient n'est jamais appelé.
export function createClient(): never {
  throw new Error('Supabase non disponible dans le test hors ligne');
}
export type SupabaseClient = never;
export type Session = never;

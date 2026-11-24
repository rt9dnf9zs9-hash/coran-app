// Répétition espacée (algorithme SM-2 adapté, sans dépendance).
// Chaque « carte » est une notion : lettre, forme, signe, mot de vocabulaire, conjugaison.

export interface ReviewCard {
  key: string; // ex. "letter:hha", "word:kitab"
  ease: number; // facteur de facilité (>= 1.3)
  intervalDays: number;
  reps: number;
  lapses: number;
  due: string; // ISO
  lastResult?: 'good' | 'again';
}

const DAY = 86_400_000;

export function newCard(key: string, now = new Date()): ReviewCard {
  return { key, ease: 2.5, intervalDays: 0, reps: 0, lapses: 0, due: now.toISOString() };
}

/** good = « je savais » / réponse juste ; again = « à revoir » / erreur. */
export function grade(card: ReviewCard, result: 'good' | 'again', now = new Date()): ReviewCard {
  if (result === 'again') {
    return {
      ...card,
      ease: Math.max(1.3, card.ease - 0.2),
      intervalDays: 0,
      reps: 0,
      lapses: card.lapses + 1,
      // revient dans 10 minutes pendant la session, puis le lendemain si toujours raté
      due: new Date(now.getTime() + 10 * 60_000).toISOString(),
      lastResult: 'again',
    };
  }
  const reps = card.reps + 1;
  const intervalDays = reps === 1 ? 1 : reps === 2 ? 3 : Math.round(card.intervalDays * card.ease);
  return {
    ...card,
    ease: Math.min(3.0, card.ease + 0.05),
    intervalDays,
    reps,
    due: new Date(now.getTime() + intervalDays * DAY).toISOString(),
    lastResult: 'good',
  };
}

/** File du jour : cartes échues, les plus fragiles d'abord (erreurs nombreuses, facilité basse). */
export function dueQueue(cards: ReviewCard[], now = new Date(), limit = 30): ReviewCard[] {
  return cards
    .filter((c) => c.due <= now.toISOString())
    .sort((a, b) => b.lapses - a.lapses || a.ease - b.ease || a.due.localeCompare(b.due))
    .slice(0, limit);
}

/** Notions les moins maîtrisées, pour l'écran « Points à travailler ». */
export function weakest(cards: ReviewCard[], n = 5): ReviewCard[] {
  return cards
    .filter((c) => c.lapses > 0)
    .sort((a, b) => b.lapses - a.lapses || a.ease - b.ease)
    .slice(0, n);
}

/** Une erreur sur une lettre programme aussi ses lettres « jumelles » (même squelette) : on révise par contraste. */
export function withContrastSiblings(key: string, families: Record<string, string[]>): string[] {
  const [kind, id] = key.split(':');
  if (kind !== 'letter' || !id) return [key];
  for (const members of Object.values(families)) {
    if (members.includes(id)) return members.map((m) => `letter:${m}`);
  }
  return [key];
}

import type { Answer, Exercise, Feedback, Option } from './types.ts';

function optLabel(o: Option | undefined): string {
  if (!o) return '';
  if (o.ar && o.label) return `${o.ar} (${o.label})`;
  return o.ar ?? o.label ?? o.id;
}

/** Évalue une réponse et produit une correction explicative (jamais un simple « faux »). */
export function evaluate(ex: Exercise, answer: Answer): Feedback {
  if (ex.type !== answer.type) {
    throw new Error(`Type de réponse ${answer.type} incompatible avec l'exercice ${ex.type}`);
  }
  switch (ex.type) {
    case 'choice': {
      const a = answer as Extract<Answer, { type: 'choice' }>;
      const chosen = ex.options.find((o) => o.id === a.optionId);
      const expected = ex.options.find((o) => o.id === ex.answer);
      if (!expected) throw new Error(`Exercice ${ex.id} : réponse attendue introuvable`);
      const correct = a.optionId === ex.answer;
      return correct
        ? { correct, explanation: ex.explanation }
        : {
            correct,
            explanation: ex.explanation,
            expectedLabel: optLabel(expected),
            mistake: chosen?.why ?? `Vous avez choisi ${optLabel(chosen)}, mais la bonne réponse est ${optLabel(expected)}.`,
          };
    }
    case 'match': {
      const a = answer as Extract<Answer, { type: 'match' }>;
      const wrong = ex.pairs.filter((p) => a.pairs[p.left.id] !== p.right.id);
      if (wrong.length === 0) return { correct: true, explanation: ex.explanation };
      const details = wrong.map((p) => `${optLabel(p.left)} → ${optLabel(p.right)}`).join(' ; ');
      return {
        correct: false,
        explanation: ex.explanation,
        mistake: `${wrong.length} association(s) incorrecte(s). Les bonnes associations étaient : ${details}.`,
      };
    }
    case 'sort': {
      const a = answer as Extract<Answer, { type: 'sort' }>;
      const wrong = ex.items.filter((it) => a.placement[it.id] !== it.bucket);
      if (wrong.length === 0) return { correct: true, explanation: ex.explanation };
      const bucketLabel = (id: string) => ex.buckets.find((b) => b.id === id)?.label ?? id;
      const details = wrong.map((it) => `${optLabel(it)} va dans « ${bucketLabel(it.bucket)} »${it.why ? ` : ${it.why}` : ''}`).join(' ; ');
      return { correct: false, explanation: ex.explanation, mistake: details };
    }
    case 'order': {
      const a = answer as Extract<Answer, { type: 'order' }>;
      const expected = ex.pieces.map((p) => p.id);
      const correct = expected.length === a.sequence.length && expected.every((id, i) => a.sequence[i] === id);
      return correct
        ? { correct, explanation: ex.explanation }
        : {
            correct,
            explanation: ex.explanation,
            expectedLabel: ex.pieces.map(optLabel).join(' + '),
            mistake: `L'ordre attendu (lu de droite à gauche) était : ${ex.pieces.map(optLabel).join(' puis ')}.`,
          };
    }
  }
}

/** Mélange déterministe (graine) : un même exercice s'affiche pareil sur web et mobile. */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const rnd = () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Vérifie la cohérence structurelle d'un exercice (utilisé par les tests et l'admin). */
export function validateExercise(ex: Exercise): string[] {
  const errors: string[] = [];
  if (!ex.id) errors.push('id manquant');
  if (!ex.prompt?.trim()) errors.push(`${ex.id} : consigne vide`);
  if (!ex.explanation?.trim()) errors.push(`${ex.id} : explication vide`);
  switch (ex.type) {
    case 'choice': {
      if (ex.options.length < 2) errors.push(`${ex.id} : moins de 2 options`);
      const ids = new Set(ex.options.map((o) => o.id));
      if (ids.size !== ex.options.length) errors.push(`${ex.id} : options en double`);
      if (!ids.has(ex.answer)) errors.push(`${ex.id} : réponse absente des options`);
      const labels = ex.options.map((o) => `${o.ar ?? ''}|${o.label ?? ''}`);
      if (new Set(labels).size !== labels.length) errors.push(`${ex.id} : deux options identiques`);
      break;
    }
    case 'match':
      if (ex.pairs.length < 2) errors.push(`${ex.id} : moins de 2 paires`);
      break;
    case 'sort':
      if (ex.buckets.length < 2) errors.push(`${ex.id} : moins de 2 catégories`);
      for (const it of ex.items) if (!ex.buckets.some((b) => b.id === it.bucket)) errors.push(`${ex.id} : catégorie inconnue ${it.bucket}`);
      break;
    case 'order':
      if (ex.pieces.length < 2) errors.push(`${ex.id} : moins de 2 fragments`);
      break;
  }
  return errors;
}

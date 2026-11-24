import { describeDots, formsOf, LETTERS, letter, seededShuffle } from '../../core/src/index.ts';
import type { ChoiceExercise, ChoiceFormat, Exercise, Lesson, Letter, Option, Step } from '../../core/src/index.ts';

export function choice(
  id: string,
  format: ChoiceFormat,
  prompt: string,
  options: Option[],
  answer: string,
  explanation: string,
  extra: Partial<ChoiceExercise> = {},
): ChoiceExercise {
  return { id, type: 'choice', format, prompt, options: seededShuffle(options, id), answer, explanation, ...extra };
}

/** QCM à partir d'une liste de libellés : le premier est la bonne réponse. */
export function quick(
  id: string,
  format: ChoiceFormat,
  prompt: string,
  correct: { label?: string; ar?: string },
  wrongs: { label?: string; ar?: string; why: string }[],
  explanation: string,
  extra: Partial<ChoiceExercise> = {},
): ChoiceExercise {
  const options: Option[] = [{ id: 'a', ...correct }, ...wrongs.map((w, i) => ({ id: String.fromCharCode(98 + i), ...w }))];
  return choice(id, format, prompt, options, 'a', explanation, extra);
}

function distractors(l: Letter, pool: Letter[], n: number, seed: string): Letter[] {
  const sameFamily = LETTERS.filter((x) => x.family === l.family && x.id !== l.id);
  const others = seededShuffle(pool.filter((x) => x.id !== l.id && x.family !== l.family), seed);
  return [...sameFamily, ...others].slice(0, n);
}

function letterWhy(d: Letter): string {
  return `${d.ar} est ${d.name} : ${d.sound}. Repère visuel : ${describeDots(d)}.`;
}

export function letterExplanation(l: Letter): string {
  return `${l.ar} se nomme ${l.name} (${l.nameAr}) et se transcrit « ${l.translit} » : ${l.sound}. Repère visuel : ${describeDots(l)}.`;
}

export function listenLetter(prefix: string, l: Letter, pool: Letter[]): ChoiceExercise {
  const ds = distractors(l, pool, 3, prefix + l.id);
  return choice(
    `${prefix}-listen-${l.id}`,
    'listen',
    'Écoutez puis choisissez la lettre entendue',
    [{ id: l.id, ar: l.ar }, ...ds.map((d) => ({ id: d.id, ar: d.ar, why: letterWhy(d) }))],
    l.id,
    letterExplanation(l),
    { audio: `letter:${l.id}`, textFallback: `Quelle lettre se prononce ${l.sound} ?`, reviewKey: `letter:${l.id}` },
  );
}

export function nameToLetter(prefix: string, l: Letter, pool: Letter[]): ChoiceExercise {
  const ds = distractors(l, pool, 3, prefix + 'n' + l.id);
  return choice(
    `${prefix}-name-${l.id}`,
    'visual',
    `Quelle lettre s'appelle « ${l.name} » ?`,
    [{ id: l.id, ar: l.ar }, ...ds.map((d) => ({ id: d.id, ar: d.ar, why: letterWhy(d) }))],
    l.id,
    letterExplanation(l),
    { reviewKey: `letter:${l.id}` },
  );
}

export function letterToSound(prefix: string, l: Letter, pool: Letter[]): ChoiceExercise {
  const ds = distractors(l, pool, 3, prefix + 's' + l.id);
  return choice(
    `${prefix}-sound-${l.id}`,
    'mcq',
    'Quel son correspond à cette lettre ?',
    [{ id: l.id, label: `« ${l.translit} »` }, ...ds.map((d) => ({ id: d.id, label: `« ${d.translit} »`, why: letterWhy(d) }))],
    l.id,
    letterExplanation(l),
    { ar: l.ar, reviewKey: `letter:${l.id}` },
  );
}

export function matchNames(id: string, ls: Letter[]): Exercise {
  return {
    id,
    type: 'match',
    prompt: 'Associez chaque lettre à son nom',
    pairs: ls.map((l) => ({ left: { id: `l-${l.id}`, ar: l.ar }, right: { id: `r-${l.id}`, label: l.name } })),
    explanation: ls.map((l) => `${l.ar} = ${l.name}`).join(' · '),
  };
}

export function formExercise(prefix: string, l: Letter, pos: 'initial' | 'medial' | 'final'): ChoiceExercise {
  const f = formsOf(l);
  const posFr = { initial: 'initiale (début de mot)', medial: 'médiane (milieu de mot)', final: 'finale (fin de mot)' }[pos];
  const sibling = LETTERS.find((x) => x.family === l.family && x.id !== l.id) ?? letter(l.id === 'ba' ? 'nun' : 'ba');
  const other = LETTERS.find((x) => x.family !== l.family && x.joins === l.joins && x.id !== l.id && x.id !== sibling.id)!;
  return choice(
    `${prefix}-form-${pos}-${l.id}`,
    'visual',
    `Quelle est la forme ${posFr} de ${l.name} ?`,
    [
      { id: 'ok', ar: f[pos] },
      { id: 'sib', ar: formsOf(sibling)[pos], why: `C'est la forme ${posFr} de ${sibling.name} (${describeDots(sibling)}), pas de ${l.name} (${describeDots(l)}).` },
      { id: 'oth', ar: formsOf(other)[pos], why: `C'est la forme ${posFr} de ${other.name}.` },
      ...(pos !== 'final' ? [{ id: 'iso', ar: f.final === f[pos] ? f.isolated : f.final, why: `Ce tracé n'est pas celui de la position ${posFr}.` }] : []),
    ],
    'ok',
    `${l.name} en position ${posFr} s'écrit ${f[pos]}. ${l.joins ? 'Cette lettre se lie aux deux côtés.' : 'Cette lettre ne se lie jamais à la lettre suivante : sa forme initiale est identique à la forme isolée.'}`,
    { reviewKey: `form:${l.id}` },
  );
}

/** Test de fin de module : 2 exercices tirés (déterministiquement) de chaque leçon. */
export function moduleTest(moduleId: number, lessons: Lesson[], title: string, perLesson = 2, kind: Lesson['kind'] = 'module_test'): Lesson {
  const exercises: Exercise[] = [];
  for (const l of lessons) {
    for (const ex of seededShuffle(l.exercises, `test-${moduleId}-${l.id}`).slice(0, perLesson)) {
      exercises.push({ ...ex, id: `${kind}-m${moduleId}-${ex.id}` });
    }
  }
  return {
    id: kind === 'final_exam' ? 'exam-free' : `m${moduleId}-test`,
    moduleId,
    position: 99,
    title,
    objective: 'Valider les acquis du module : 80 % de bonnes réponses sont nécessaires.',
    difficulty: 2,
    estMinutes: Math.ceil(exercises.length * 0.6),
    kind,
    steps: [{ kind: 'explain', text: 'Ce test reprend les notions des leçons du module. Prenez votre temps : il n’y a pas de limite de durée et vous pourrez le repasser.' }],
    exercises,
    summary: ['Résultat enregistré dans votre progression.', 'Les notions manquées sont ajoutées à vos révisions.'],
  };
}

export const ex = (ar: string, translit?: string, fr?: string, audio?: string): Step => ({ kind: 'example', ar, translit, fr, audio });
export const explain = (text: string): Step => ({ kind: 'explain', text });
export const tip = (text: string): Step => ({ kind: 'tip', text });

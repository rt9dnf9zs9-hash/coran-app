import type { Exercise, Lesson, Module, Step } from '../../core/src/index.ts';
import { module1, module2 } from './m1-m2.ts';
import { module3, module4 } from './m3-m4.ts';
import { buildModule5, module5Lessons, VOCABULARY } from './m5.ts';
import { module6, module7, module8 } from './m6-m8.ts';

const freeLessonsBefore5 = [module1, module2, module3, module4].flatMap((m) => m.lessons.filter((l) => l.kind === 'lesson'));
export const module5 = buildModule5([...freeLessonsBefore5, ...module5Lessons]);

export const MODULES: Module[] = [module1, module2, module3, module4, module5, module6, module7, module8];
export const FREE_MODULES = MODULES.filter((m) => m.tier === 'free');
export { VOCABULARY };

export function allLessons(): Lesson[] {
  return MODULES.flatMap((m) => m.lessons);
}

function stepAudio(s: Step): string[] {
  return s.kind === 'example' && s.audio ? [s.audio] : s.kind === 'letter' ? [`letter:${s.letterId}`] : [];
}
function exAudio(e: Exercise): string[] {
  return e.audio ? [e.audio] : [];
}

/** Liste exhaustive des enregistrements nécessaires (à produire avec des droits commerciaux). */
export function requiredAudioKeys(): { key: string; lessonIds: string[] }[] {
  const map = new Map<string, Set<string>>();
  for (const l of allLessons()) {
    for (const k of [...l.steps.flatMap(stepAudio), ...l.exercises.flatMap(exAudio)]) {
      if (!map.has(k)) map.set(k, new Set());
      map.get(k)!.add(l.id);
    }
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, s]) => ({ key, lessonIds: [...s] }));
}

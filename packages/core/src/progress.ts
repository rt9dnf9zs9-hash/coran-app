import type { Lesson, Module, Tier } from './types.ts';

/** Score minimal aux exercices de validation pour considérer une leçon comme acquise. */
export const PASS_THRESHOLD = 0.8;

export type LessonStatus = 'not_started' | 'started' | 'completed' | 'to_review';

export interface LessonProgress {
  lessonId: string;
  status: LessonStatus;
  /** meilleur score obtenu (0..1) */
  bestScore: number;
  attempts: number;
  /** étape atteinte dans la leçon (reprise) */
  stepIndex: number;
  updatedAt: string;
  completedAt?: string | null;
}

export interface AttemptResult {
  correct: number;
  total: number;
}

export function scoreOf(r: AttemptResult): number {
  return r.total === 0 ? 0 : r.correct / r.total;
}

/** Une leçon n'est acquise QUE si les exercices de validation ont été faits et réussis. */
export function applyAttempt(prev: LessonProgress | undefined, lessonId: string, r: AttemptResult, now = new Date()): LessonProgress {
  if (r.total === 0) throw new Error('Une tentative doit comporter au moins un exercice de validation');
  const score = scoreOf(r);
  const passed = score >= PASS_THRESHOLD;
  const wasCompleted = prev?.status === 'completed' || prev?.status === 'to_review';
  return {
    lessonId,
    status: passed ? 'completed' : wasCompleted ? 'to_review' : 'started',
    bestScore: Math.max(prev?.bestScore ?? 0, score),
    attempts: (prev?.attempts ?? 0) + 1,
    stepIndex: 0,
    updatedAt: now.toISOString(),
    completedAt: passed ? (prev?.completedAt ?? now.toISOString()) : (prev?.completedAt ?? null),
  };
}

export function markStarted(prev: LessonProgress | undefined, lessonId: string, stepIndex: number, now = new Date()): LessonProgress {
  return {
    lessonId,
    status: prev && prev.status !== 'not_started' ? prev.status : 'started',
    bestScore: prev?.bestScore ?? 0,
    attempts: prev?.attempts ?? 0,
    stepIndex: Math.max(0, stepIndex),
    updatedAt: now.toISOString(),
    completedAt: prev?.completedAt ?? null,
  };
}

/** Fusion de progression (invité → compte, ou deux appareils) : on garde le meilleur état. */
export function mergeProgress(a: LessonProgress, b: LessonProgress): LessonProgress {
  const rank: Record<LessonStatus, number> = { not_started: 0, started: 1, to_review: 2, completed: 3 };
  const newer = a.updatedAt >= b.updatedAt ? a : b;
  const status = rank[a.status] >= rank[b.status] ? a.status : b.status;
  const completedAts = [a.completedAt, b.completedAt].filter(Boolean) as string[];
  return {
    lessonId: a.lessonId,
    status,
    bestScore: Math.max(a.bestScore, b.bestScore),
    attempts: Math.max(a.attempts, b.attempts),
    stepIndex: newer.stepIndex,
    updatedAt: newer.updatedAt,
    completedAt: completedAts.sort()[0] ?? null,
  };
}

export type ModuleState = 'completed' | 'in_progress' | 'available' | 'recommended_later' | 'premium_locked' | 'premium_unlocked';

export function isCompleted(p: LessonProgress | undefined): boolean {
  return p?.status === 'completed' || p?.status === 'to_review';
}

export function moduleCompletion(m: Pick<Module, 'lessons'>, progress: Record<string, LessonProgress>): number {
  if (m.lessons.length === 0) return 0;
  return m.lessons.filter((l) => isCompleted(progress[l.id])).length / m.lessons.length;
}

/** Un module est terminé quand toutes ses leçons ET son test de fin de module sont réussis. */
export function moduleState(
  m: Pick<Module, 'id' | 'tier' | 'lessons'>,
  prevModule: Pick<Module, 'lessons'> | undefined,
  progress: Record<string, LessonProgress>,
  hasPremium: boolean,
): ModuleState {
  if (m.tier === 'premium' && !hasPremium) return 'premium_locked';
  const c = moduleCompletion(m, progress);
  if (c === 1) return 'completed';
  const started = m.lessons.some((l) => (progress[l.id]?.status ?? 'not_started') !== 'not_started');
  if (started) return 'in_progress';
  if (m.tier === 'premium') return 'premium_unlocked';
  if (!prevModule || moduleCompletion(prevModule, progress) === 1) return 'available';
  // Jamais bloquant : le module reste ouvrable, il est seulement « conseillé plus tard ».
  return 'recommended_later';
}

/** Règle d'accès (indication d'interface). La vraie vérification est faite côté serveur (RLS). */
export function canOpen(tier: Tier, hasPremium: boolean): boolean {
  return tier === 'free' || hasPremium;
}

export function nextLesson(modules: Module[], progress: Record<string, LessonProgress>, hasPremium: boolean): Lesson | undefined {
  for (const m of modules) {
    if (!canOpen(m.tier, hasPremium)) continue;
    for (const l of m.lessons) if (!isCompleted(progress[l.id])) return l;
  }
  return undefined;
}

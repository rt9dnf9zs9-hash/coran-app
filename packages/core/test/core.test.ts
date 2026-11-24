import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applyAttempt, canOpen, dueQueue, evaluate, formsOf, grade, LETTERS, letter, markStarted, mergeProgress, moduleState,
  newCard, nextLesson, NON_JOINING, seededShuffle, withContrastSiblings,
} from '../src/index.ts';
import type { ChoiceExercise, Lesson, Module } from '../src/index.ts';

test('alphabet : 28 lettres, 6 non liantes, 14 solaires', () => {
  assert.equal(LETTERS.length, 28);
  assert.deepEqual(NON_JOINING.map((l) => l.ar).join(''), 'ادذرزو');
  assert.equal(LETTERS.filter((l) => l.sun).length, 14);
});

test('formes contextuelles : une lettre non liante a la même forme isolée et initiale', () => {
  const d = formsOf(letter('dal'));
  assert.equal(d.initial, d.isolated);
  const b = formsOf(letter('ba'));
  assert.notEqual(b.initial, b.isolated);
  assert.equal(b.medial, 'ـبـ');
});

const ex: ChoiceExercise = {
  id: 'x', type: 'choice', format: 'mcq', prompt: 'p', explanation: 'expl',
  options: [{ id: 'a', ar: 'ح' }, { id: 'b', ar: 'ه', why: 'ه est un h léger.' }], answer: 'a',
};

test('correction : bonne réponse et explication de l’erreur', () => {
  assert.deepEqual(evaluate(ex, { type: 'choice', optionId: 'a' }), { correct: true, explanation: 'expl' });
  const fb = evaluate(ex, { type: 'choice', optionId: 'b' });
  assert.equal(fb.correct, false);
  assert.equal(fb.mistake, 'ه est un h léger.');
});

test('mélange déterministe', () => {
  assert.deepEqual(seededShuffle([1, 2, 3, 4, 5], 'abc'), seededShuffle([1, 2, 3, 4, 5], 'abc'));
});

test('une leçon n’est acquise qu’avec 80 % aux exercices de validation', () => {
  const started = markStarted(undefined, 'l1', 2);
  assert.equal(started.status, 'started');
  const fail = applyAttempt(started, 'l1', { correct: 3, total: 5 });
  assert.equal(fail.status, 'started');
  const pass = applyAttempt(fail, 'l1', { correct: 4, total: 5 });
  assert.equal(pass.status, 'completed');
  assert.equal(pass.attempts, 2);
  const later = applyAttempt(pass, 'l1', { correct: 1, total: 5 });
  assert.equal(later.status, 'to_review', 'une leçon acquise puis ratée passe « à revoir », sans perdre l’acquis');
  assert.equal(later.bestScore, 0.8);
  assert.throws(() => applyAttempt(undefined, 'l1', { correct: 0, total: 0 }));
});

test('fusion de progression entre appareils : on garde le meilleur état', () => {
  const a = { lessonId: 'l', status: 'completed' as const, bestScore: 0.9, attempts: 1, stepIndex: 0, updatedAt: '2026-01-01T00:00:00Z', completedAt: '2026-01-01T00:00:00Z' };
  const b = { lessonId: 'l', status: 'started' as const, bestScore: 0.2, attempts: 3, stepIndex: 4, updatedAt: '2026-02-01T00:00:00Z', completedAt: null };
  const m = mergeProgress(a, b);
  assert.equal(m.status, 'completed');
  assert.equal(m.bestScore, 0.9);
  assert.equal(m.stepIndex, 4);
  assert.equal(m.completedAt, '2026-01-01T00:00:00Z');
});

const lesson = (id: string): Lesson => ({ id, moduleId: 1, position: 1, title: id, objective: '', difficulty: 1, estMinutes: 1, kind: 'lesson', steps: [], exercises: [], summary: [] });
const mods: Module[] = [
  { id: 1, title: '', subtitle: '', tier: 'free', lessons: [lesson('a'), lesson('b')] },
  { id: 6, title: '', subtitle: '', tier: 'premium', lessons: [lesson('p')] },
];

test('droits : gratuit toujours ouvert, Premium seulement avec abonnement', () => {
  assert.equal(canOpen('free', false), true);
  assert.equal(canOpen('premium', false), false);
  assert.equal(canOpen('premium', true), true);
  assert.equal(moduleState(mods[1]!, mods[0], {}, false), 'premium_locked');
  assert.equal(moduleState(mods[1]!, mods[0], {}, true), 'premium_unlocked');
  const prog = { a: { lessonId: 'a', status: 'completed' as const, bestScore: 1, attempts: 1, stepIndex: 0, updatedAt: '' }, b: { lessonId: 'b', status: 'completed' as const, bestScore: 1, attempts: 1, stepIndex: 0, updatedAt: '' } };
  assert.equal(nextLesson(mods, prog, false), undefined, 'sans Premium, pas de leçon Premium proposée');
  assert.equal(nextLesson(mods, prog, true)?.id, 'p');
  assert.equal(moduleState(mods[0]!, undefined, prog, false), 'completed');
});

test('expiration Premium : la progression est conservée', () => {
  const prog = { p: { lessonId: 'p', status: 'completed' as const, bestScore: 1, attempts: 1, stepIndex: 0, updatedAt: '' } };
  assert.equal(moduleState(mods[1]!, mods[0], prog, false), 'premium_locked');
  assert.equal(moduleState(mods[1]!, mods[0], prog, true), 'completed');
});

test('répétition espacée : intervalles croissants, erreur = retour rapide', () => {
  const t0 = new Date('2026-01-01T00:00:00Z');
  let c = newCard('letter:hha', t0);
  c = grade(c, 'good', t0);
  assert.equal(c.intervalDays, 1);
  c = grade(c, 'good', t0);
  assert.equal(c.intervalDays, 3);
  c = grade(c, 'good', t0);
  assert.ok(c.intervalDays > 3);
  const failed = grade(c, 'again', t0);
  assert.equal(failed.lapses, 1);
  assert.ok(new Date(failed.due).getTime() - t0.getTime() <= 10 * 60_000);
  const queue = dueQueue([failed, newCard('x', t0)], new Date('2026-01-01T01:00:00Z'));
  assert.equal(queue[0]!.key, 'letter:hha', 'les notions ratées passent en priorité');
});

test('révision par contraste des lettres jumelles', () => {
  const fam = { jim: ['jim', 'hha', 'kha'] };
  assert.deepEqual(withContrastSiblings('letter:hha', fam), ['letter:jim', 'letter:hha', 'letter:kha']);
  assert.deepEqual(withContrastSiblings('word:kitab', fam), ['word:kitab']);
});

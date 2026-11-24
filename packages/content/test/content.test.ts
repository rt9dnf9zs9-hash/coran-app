import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluate, hasArabic, validateExercise } from '../../core/src/index.ts';
import type { Answer, Exercise } from '../../core/src/index.ts';
import { allLessons, FREE_MODULES, MODULES, VOCABULARY } from '../src/index.ts';

test('8 modules : 1 à 5 gratuits, 6 à 8 Premium', () => {
  assert.equal(MODULES.length, 8);
  assert.deepEqual(MODULES.map((m) => m.tier), ['free', 'free', 'free', 'free', 'free', 'premium', 'premium', 'premium']);
  assert.equal(FREE_MODULES.length, 5);
});

test('chaque module a des leçons réelles et un test de fin de module', () => {
  for (const m of MODULES) {
    const lessons = m.lessons.filter((l) => l.kind === 'lesson');
    assert.ok(lessons.length >= 4, `module ${m.id} : au moins 4 leçons`);
    assert.ok(m.lessons.some((l) => l.kind === 'module_test'), `module ${m.id} : test de fin de module`);
    for (const l of lessons) {
      assert.ok(l.objective.length > 10, `${l.id} : objectif`);
      assert.ok(l.steps.length >= 1, `${l.id} : étapes`);
      assert.ok(l.exercises.length >= 2, `${l.id} : au moins 2 exercices de validation`);
      assert.ok(l.summary.length >= 1, `${l.id} : résumé`);
    }
  }
  assert.ok(MODULES[4]!.lessons.some((l) => l.kind === 'final_exam'), 'examen général à la fin du module 5');
});

test('identifiants de leçons et d’exercices uniques', () => {
  const lessonIds = allLessons().map((l) => l.id);
  assert.equal(new Set(lessonIds).size, lessonIds.length);
  const exIds = allLessons().flatMap((l) => l.exercises.map((e) => e.id));
  const dup = exIds.filter((id, i) => exIds.indexOf(id) !== i);
  assert.deepEqual(dup, []);
});

test('tous les exercices sont structurellement valides', () => {
  const errors = allLessons().flatMap((l) => l.exercises.flatMap(validateExercise));
  assert.deepEqual(errors, []);
});

function correctAnswer(e: Exercise): Answer {
  switch (e.type) {
    case 'choice': return { type: 'choice', optionId: e.answer };
    case 'match': return { type: 'match', pairs: Object.fromEntries(e.pairs.map((p) => [p.left.id, p.right.id])) };
    case 'sort': return { type: 'sort', placement: Object.fromEntries(e.items.map((i) => [i.id, i.bucket])) };
    case 'order': return { type: 'order', sequence: e.pieces.map((p) => p.id) };
  }
}

test('la bonne réponse de chaque exercice est acceptée, une mauvaise est expliquée', () => {
  for (const e of allLessons().flatMap((l) => l.exercises)) {
    assert.equal(evaluate(e, correctAnswer(e)).correct, true, e.id);
    if (e.type === 'choice') {
      const wrong = e.options.find((o) => o.id !== e.answer)!;
      const fb = evaluate(e, { type: 'choice', optionId: wrong.id });
      assert.equal(fb.correct, false);
      assert.ok(fb.mistake && fb.mistake.length > 10, `${e.id} : explication de l’erreur`);
    }
  }
});

test('aucun verset recopié : les citations passent par des références', () => {
  for (const l of allLessons()) {
    for (const s of l.steps) {
      if (s.kind === 'quran') {
        assert.ok(s.ref.surah >= 1 && s.ref.surah <= 114, `${l.id} : sourate valide`);
        assert.ok(s.ref.ayah >= 1, `${l.id} : verset valide`);
        assert.equal((s as unknown as { ar?: string }).ar, undefined, `${l.id} : pas de texte coranique en dur`);
      }
    }
  }
});

test('les exercices d’écoute ont une consigne de remplacement (pas d’audio simulé)', () => {
  for (const e of allLessons().flatMap((l) => l.exercises)) {
    if (e.type === 'choice' && e.format === 'listen') assert.ok(e.textFallback, `${e.id} : textFallback`);
  }
});

test('vocabulaire : arabe présent, racines au format « x y z »', () => {
  assert.ok(VOCABULARY.length >= 35);
  for (const v of VOCABULARY) {
    assert.ok(hasArabic(v.ar), v.id);
    if (v.root) assert.match(v.root, /^\S \S \S$/u, `${v.id} : racine trilittère`);
  }
});

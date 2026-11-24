// Tests de bout en bout dans un vrai navigateur (Chromium), en mode découverte (sans compte).
// Lancement : node --import tsx --test apps/web/e2e/app.e2e.test.ts
// Variables : E2E_URL (défaut http://localhost:4173/), CHROMIUM_PATH (optionnel).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, test } from 'node:test';
import { chromium, type Browser, type Page } from 'playwright';
import type { Exercise, Module } from '../../../packages/core/src/types.ts';

const URL_ = process.env.E2E_URL ?? 'http://localhost:4173/';
const content = JSON.parse(readFileSync(new URL('../src/content/free-content.json', import.meta.url), 'utf8')) as { modules: Module[] };
const lessonById = (id: string) => content.modules.flatMap((m) => m.lessons).find((l) => l.id === id)!;
const shotDir = process.env.E2E_SHOTS;

let browser: Browser;
let page: Page;
const errors: string[] = [];

before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });
  page.on('pageerror', (e) => errors.push(e.message));
});
after(async () => {
  await browser?.close();
});

const exact = (s: string) => new RegExp(`^\\s*${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`);
const optText = (o: { ar?: string; label?: string }) => (o.ar && o.label ? null : o.ar ?? o.label ?? '');

async function clickOption(scope: ReturnType<Page['locator']>, o: { ar?: string; label?: string }) {
  const t = optText(o);
  const loc = t === null ? scope.filter({ hasText: o.ar! }).filter({ hasText: o.label! }) : scope.filter({ hasText: exact(t) });
  await loc.first().click();
}

async function answer(ex: Exercise, correct: boolean) {
  switch (ex.type) {
    case 'choice': {
      const target = correct ? ex.options.find((o) => o.id === ex.answer)! : ex.options.find((o) => o.id !== ex.answer)!;
      await clickOption(page.locator('.options .option'), target);
      break;
    }
    case 'match': {
      const pairs = correct ? ex.pairs : ex.pairs.map((p, i) => ({ left: p.left, right: ex.pairs[(i + 1) % ex.pairs.length]!.right }));
      for (const p of pairs) {
        await clickOption(page.locator('[aria-label="Éléments à associer"] .option'), p.left);
        await clickOption(page.locator('[aria-label="Correspondances"] .option'), p.right);
      }
      break;
    }
    case 'sort':
      for (const it of ex.items) {
        const bucket = correct ? it.bucket : ex.buckets.find((b) => b.id !== it.bucket)!.id;
        await clickOption(page.locator('[aria-label="Éléments à classer"] .chip'), it);
        await page.locator('.sort-bucket > button').filter({ hasText: ex.buckets.find((b) => b.id === bucket)!.label }).click();
      }
      break;
    case 'order': {
      const seq = correct ? ex.pieces : [...ex.pieces].reverse();
      for (const p of seq) await clickOption(page.locator('[aria-label="Morceaux disponibles"] .chip'), p);
      break;
    }
  }
}

async function playLesson(id: string, correct: boolean) {
  await page.goto(`${URL_}#/lecon/${id}`);
  await page.getByRole('heading', { level: 1, name: lessonById(id).title }).waitFor();
  for (let i = 0; i < 30; i++) {
    const next = page.getByRole('button', { name: /^(Continuer|Passer aux exercices)$/ });
    if (await page.getByRole('button', { name: 'Vérifier' }).isVisible()) break;
    await next.click();
  }
  const lesson = lessonById(id);
  for (const [i, ex] of lesson.exercises.entries()) {
    await page.getByText(`Exercice ${i + 1} sur ${lesson.exercises.length}`).waitFor();
    if (i === 0) {
      await page.getByRole('button', { name: 'Vérifier' }).click();
      await page.getByRole('alert').filter({ hasText: /Choisissez|Associez|Placez|Utilisez/ }).waitFor();
    }
    await answer(ex, correct);
    await page.getByRole('button', { name: 'Vérifier' }).click();
    const fb = page.locator('.feedback');
    await fb.waitFor();
    assert.ok((await fb.innerText()).length > 20, `${ex.id} : correction explicative affichée`);
    if (!correct) assert.match(await fb.getAttribute('class') ?? '', /ko/, `${ex.id} : réponse fausse signalée`);
    await page.getByRole('button', { name: 'Continuer' }).click();
  }
}

test('accueil, questionnaire de démarrage et première leçon réussie', async () => {
  await page.goto(URL_);
  await page.getByRole('heading', { name: /Apprenez à lire l’arabe du Coran/ }).waitFor();
  if (shotDir) await page.screenshot({ path: `${shotDir}/01-accueil.png`, fullPage: true });
  await page.getByRole('link', { name: 'Commencer' }).click();
  await page.getByRole('radio', { name: 'Non, pas du tout' }).click();
  await page.getByRole('radio', { name: 'Non' }).click();
  await page.getByRole('radio', { name: 'Les deux' }).click();
  await page.getByRole('radio', { name: '10 minutes' }).click();
  await page.getByRole('button', { name: 'Commencer au module 1' }).click();
  await page.waitForURL(/#\/lecon\/m1l1/);
  await page.getByText('Objectif :').waitFor();
  if (shotDir) await page.screenshot({ path: `${shotDir}/02-lecon.png`, fullPage: true });
  await playLesson('m1l1', true);
  await page.getByRole('heading', { name: 'Leçon validée' }).waitFor();
  const n = lessonById('m1l1').exercises.length;
  await page.getByText(`${n} / ${n} · 100 %`).waitFor();
  if (shotDir) await page.screenshot({ path: `${shotDir}/03-resultat.png`, fullPage: true });
});

test('exercice d’écoute sans enregistrement : indication, jamais de son simulé', async () => {
  await page.goto(`${URL_}#/lecon/m1l2`);
  for (let i = 0; i < 10 && !(await page.getByRole('button', { name: 'Vérifier' }).isVisible()); i++) {
    await page.getByRole('button', { name: /^(Continuer|Passer aux exercices)$/ }).click();
  }
  await page.getByText('Enregistrement bientôt disponible', { exact: false }).first().waitFor();
  const h2 = await page.locator('section h2').first().innerText();
  assert.match(h2, /Quelle lettre se prononce/, 'consigne de remplacement affichée');
});

test('échec : leçon non validée, corrections expliquées, révisions créées', async () => {
  await playLesson('m1l2', false);
  await page.getByRole('heading', { name: 'Pas encore validé' }).waitFor();
  await page.getByRole('button', { name: 'Refaire les exercices' }).waitFor();
  await page.goto(`${URL_}#/revisions`);
  await page.getByRole('button', { name: 'Voir la réponse' }).click();
  await page.getByRole('button', { name: 'Je savais' }).click();
  if (shotDir) await page.screenshot({ path: `${shotDir}/04-revisions.png`, fullPage: true });
});

test('progression enregistrée et tableau de bord', async () => {
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('guest:progress') ?? '{}'));
  assert.equal(stored.m1l1.status, 'completed');
  assert.notEqual(stored.m1l2.status, 'completed', 'une leçon ratée n’est pas acquise');
  await page.goto(URL_);
  await page.getByText('Lettres qui', { exact: false }).or(page.getByText('La famille de jīm')).first().waitFor();
  await page.getByRole('link', { name: /Reprendre ma leçon|Commencer la leçon/ }).waitFor();
  await page.goto(`${URL_}#/progression`);
  await page.getByRole('heading', { name: 'Points à travailler' }).waitFor();
});

test('parcours : modules gratuits et Premium clairement distingués', async () => {
  await page.goto(`${URL_}#/apprendre`);
  await page.getByText('Fin du parcours gratuit').waitFor();
  assert.equal(await page.locator('.badge.gold', { hasText: 'Premium' }).count(), 3);
  if (shotDir) await page.screenshot({ path: `${shotDir}/05-parcours.png`, fullPage: true });
});

test('leçon Premium sans abonnement : présentation de l’offre, retour au gratuit possible', async () => {
  await page.goto(`${URL_}#/lecon/m6l1`);
  await page.getByText('Cette leçon fait partie de l’offre Premium.').waitFor();
  await page.getByText('Renouvellement :').waitFor();
  await page.getByText('Résiliation :').waitFor();
  await page.getByRole('link', { name: 'Continuer le parcours gratuit' }).click();
  await page.waitForURL(/#\/apprendre/);
});

test('affichage RTL de l’arabe au milieu du français', async () => {
  await page.goto(`${URL_}#/lecon/m2l3`);
  const dir = await page.locator('[lang="ar"]').first().evaluate((el) => getComputedStyle(el).direction);
  assert.equal(dir, 'rtl');
  await page.goto(`${URL_}#/lecon/m6l1`);
});

test('grand écran : navigation latérale', async () => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(URL_);
  const pos = await page.locator('nav.nav').evaluate((el) => getComputedStyle(el).position);
  assert.equal(pos, 'sticky');
  if (shotDir) await page.screenshot({ path: `${shotDir}/06-ordinateur.png` });
  await page.setViewportSize({ width: 390, height: 844 });
});

test('profil : réglages appliqués (taille de l’arabe, thème)', async () => {
  await page.goto(`${URL_}#/profil`);
  await page.getByLabel('Thème').selectOption('dark');
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
  await page.getByLabel('Thème').selectOption('light');
});

test('aucune erreur JavaScript pendant le parcours', () => {
  assert.deepEqual(errors, []);
});

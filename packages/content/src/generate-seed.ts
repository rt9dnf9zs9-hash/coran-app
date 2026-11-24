// Génère :
//  - supabase/seed.sql                       (tout le contenu, y compris Premium → protégé par RLS)
//  - apps/web/src/content/free-content.json  (modules gratuits seulement, embarqués pour le hors-ligne)
//  - apps/mobile/content/free-content.json   (idem pour l'app mobile)
//  - docs/AUDIOS_A_ENREGISTRER.csv           (liste des enregistrements à produire)
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FREE_MODULES, MODULES, requiredAudioKeys, VOCABULARY } from './index.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const out = (rel: string, data: string) => {
  const p = resolve(root, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, data);
  console.log(`✔ ${rel} (${Math.round(data.length / 1024)} Ko)`);
};

const lit = (v: unknown): string => {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return `'${String(v).replace(/'/g, "''")}'`;
};
const json = (v: unknown) => `${lit(JSON.stringify(v))}::jsonb`;

const sql: string[] = [
  '-- Fichier généré par packages/content/src/generate-seed.ts — ne pas modifier à la main.',
  'begin;',
  "insert into public.courses (id, slug, title_fr) values (1, 'arabe-coranique', 'Arabe coranique pour francophones') on conflict (id) do update set title_fr = excluded.title_fr;",
];
for (const m of MODULES) {
  sql.push(
    `insert into public.modules (id, course_id, position, title_fr, subtitle_fr, tier, published) values (${m.id}, 1, ${m.id}, ${lit(m.title)}, ${lit(m.subtitle)}, ${lit(m.tier)}, true) on conflict (id) do update set title_fr = excluded.title_fr, subtitle_fr = excluded.subtitle_fr, tier = excluded.tier;`,
  );
  for (const l of m.lessons) {
    const content = { steps: l.steps, exercises: l.exercises, summary: l.summary };
    sql.push(
      `insert into public.lessons (id, module_id, position, title_fr, objective_fr, difficulty, est_minutes, kind, published) values (${lit(l.id)}, ${m.id}, ${l.position}, ${lit(l.title)}, ${lit(l.objective)}, ${l.difficulty}, ${l.estMinutes}, ${lit(l.kind)}, true) on conflict (id) do update set title_fr = excluded.title_fr, objective_fr = excluded.objective_fr, difficulty = excluded.difficulty, est_minutes = excluded.est_minutes, kind = excluded.kind, position = excluded.position;`,
      `insert into public.lesson_contents (lesson_id, content) values (${lit(l.id)}, ${json(content)}) on conflict (lesson_id) do update set content = excluded.content, version = public.lesson_contents.version + 1, updated_at = now();`,
    );
  }
}
for (const v of VOCABULARY) {
  sql.push(
    `insert into public.vocabulary (id, arabic, transliteration, meaning_fr, root, note_fr, quran_ref) values (${lit(v.id)}, ${lit(v.ar)}, ${lit(v.translit)}, ${lit(v.fr)}, ${lit(v.root)}, ${lit(v.note ?? null)}, ${v.ref ? json(v.ref) : 'null'}) on conflict (id) do update set arabic = excluded.arabic, meaning_fr = excluded.meaning_fr, root = excluded.root, note_fr = excluded.note_fr, quran_ref = excluded.quran_ref;`,
  );
}
sql.push('commit;', '');
out('supabase/seed.sql', sql.join('\n'));

const free = { generatedAt: new Date().toISOString(), modules: FREE_MODULES, premiumModules: MODULES.filter((m) => m.tier === 'premium').map((m) => ({ id: m.id, title: m.title, subtitle: m.subtitle, tier: m.tier, lessons: m.lessons.map((l) => ({ id: l.id, moduleId: l.moduleId, position: l.position, title: l.title, objective: l.objective, difficulty: l.difficulty, estMinutes: l.estMinutes, kind: l.kind })) })) };
const freeJson = JSON.stringify(free);
out('apps/web/src/content/free-content.json', freeJson);
out('apps/mobile/content/free-content.json', freeJson);

const audio = requiredAudioKeys();
out('docs/AUDIOS_A_ENREGISTRER.csv', ['cle;chemin_storage_suggere;lecons', ...audio.map((a) => `${a.key};${a.key.replace(':', '/')}.m4a;${a.lessonIds.join(' ')}`)].join('\n') + '\n');
console.log(`${MODULES.length} modules, ${MODULES.reduce((n, m) => n + m.lessons.length, 0)} leçons, ${VOCABULARY.length} mots, ${audio.length} audios requis.`);

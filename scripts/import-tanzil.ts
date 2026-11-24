// Import du texte coranique vérifié de Tanzil (https://tanzil.net/download).
// Usage :
//   1. Téléchargez « Simple » et « Uthmani » au format « Text (with aya numbers) » → data/tanzil/
//      (fichiers quran-simple.txt et quran-uthmani.txt, lignes « sourate|verset|texte »)
//   2. npx tsx scripts/import-tanzil.ts            → génère supabase/quran.sql
//   3. Exécutez supabase/quran.sql dans l'éditeur SQL de Supabase (rôle postgres).
// Le texte n'est JAMAIS modifié : il est inséré tel quel. Seuls les signes de pause
// (waqf) sont ignorés pour le découpage en mots, pas dans le texte du verset.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const EXPECTED_AYAT = 6236;
const dir = resolve(process.cwd(), 'data/tanzil');
const simplePath = resolve(dir, 'quran-simple.txt');
const uthmaniPath = resolve(dir, 'quran-uthmani.txt');
const allowPartial = process.argv.includes('--allow-partial');

if (!existsSync(simplePath)) {
  console.error(`Fichier introuvable : ${simplePath}\nTéléchargez-le sur https://tanzil.net/download (Quran Type : Simple, Output : Text with aya numbers).`);
  process.exit(1);
}

type Ayah = { surah: number; ayah: number; text: string };
export function parseTanzil(content: string): Ayah[] {
  const out: Ayah[] = [];
  for (const line of content.split(/\r?\n/)) {
    if (!line.trim() || line.startsWith('#')) continue; // les lignes # contiennent la licence
    const m = /^(\d{1,3})\|(\d{1,3})\|(.+)$/.exec(line);
    if (!m) throw new Error(`Ligne invalide : ${line.slice(0, 60)}`);
    out.push({ surah: Number(m[1]), ayah: Number(m[2]), text: m[3]!.trim() });
  }
  return out;
}

// Signes de pause coraniques (petites lettres au-dessus de la ligne) : pas des mots.
const PAUSE = /^[ۖ-ۜ۞۩]+$/;
export function words(text: string): string[] {
  return text.split(/\s+/).filter((w) => w && !PAUSE.test(w));
}

const simpleRaw = readFileSync(simplePath, 'utf8');
const simple = parseTanzil(simpleRaw);
const uthmani = existsSync(uthmaniPath) ? parseTanzil(readFileSync(uthmaniPath, 'utf8')) : [];
if (!allowPartial && simple.length !== EXPECTED_AYAT) {
  console.error(`Nombre de versets inattendu : ${simple.length} (attendu ${EXPECTED_AYAT}). Fichier incomplet ou mauvais format.`);
  process.exit(1);
}
if (uthmani.length && uthmani.length !== simple.length) {
  console.error('Les fichiers Simple et Uthmani n’ont pas le même nombre de versets.');
  process.exit(1);
}
const uMap = new Map(uthmani.map((a) => [`${a.surah}:${a.ayah}`, a.text]));
const sha = createHash('sha256').update(simpleRaw).digest('hex');
const q = (s: string) => `'${s.replace(/'/g, "''")}'`;

const sql = ['-- Généré par scripts/import-tanzil.ts — texte Tanzil (CC BY 3.0), non modifié.', 'begin;',
  'alter table public.quran_ayat disable trigger quran_ayat_immutable;', 'alter table public.quran_words disable trigger quran_words_immutable;',
  'delete from public.quran_words; delete from public.quran_ayat;'];
for (const a of simple) {
  const u = uMap.get(`${a.surah}:${a.ayah}`);
  sql.push(`insert into public.quran_ayat (surah, ayah, text_simple, text_uthmani, source) values (${a.surah}, ${a.ayah}, ${q(a.text)}, ${u ? q(u) : 'null'}, 'Tanzil Project — tanzil.net');`);
  // Les mots sont découpés depuis la version affichée (uthmani si disponible, sinon simple).
  words(u ?? a.text).forEach((w, i) => sql.push(`insert into public.quran_words values (${a.surah}, ${a.ayah}, ${i + 1}, ${q(w)});`));
}
sql.push(`insert into public.quran_import_log (source, file_sha256, ayat_count) values ('tanzil quran-simple.txt', '${sha}', ${simple.length});`,
  'alter table public.quran_ayat enable trigger quran_ayat_immutable;', 'alter table public.quran_words enable trigger quran_words_immutable;', 'commit;');
writeFileSync(resolve(process.cwd(), 'supabase/quran.sql'), sql.join('\n') + '\n');
console.log(`✔ supabase/quran.sql : ${simple.length} versets, empreinte SHA-256 ${sha.slice(0, 16)}…`);

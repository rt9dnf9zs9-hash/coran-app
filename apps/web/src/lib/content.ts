import type { Lesson, Module, QuranRef } from '@coran/core';
import freeContent from '../content/free-content.json';
import { AppError, toAppError } from './errors';
import { supabase } from './supabase';

export type LessonMeta = Omit<Lesson, 'steps' | 'exercises' | 'summary'>;
export interface ModuleMeta extends Omit<Module, 'lessons'> {
  lessons: LessonMeta[];
}

const bundled = freeContent as unknown as { modules: Module[]; premiumModules: ModuleMeta[] };
const bundledLessons = new Map<string, Lesson>(bundled.modules.flatMap((m) => m.lessons.map((l) => [l.id, l] as const)));

const strip = (l: Lesson): LessonMeta => {
  const { steps: _s, exercises: _e, summary: _u, ...meta } = l;
  return meta;
};

export function bundledCatalog(): ModuleMeta[] {
  return [...bundled.modules.map((m) => ({ ...m, lessons: m.lessons.map(strip) })), ...bundled.premiumModules];
}

/** Catalogue à jour depuis la base (modifs de l'admin), avec repli sur la version embarquée. */
export async function fetchCatalog(): Promise<ModuleMeta[]> {
  if (!supabase) return bundledCatalog();
  try {
    const [mods, lessons] = await Promise.all([
      supabase.from('modules').select('id, title_fr, subtitle_fr, tier, position').order('position'),
      supabase.from('lessons').select('id, module_id, position, title_fr, objective_fr, difficulty, est_minutes, kind').order('module_id').order('position'),
    ]);
    if (mods.error) throw mods.error;
    if (lessons.error) throw lessons.error;
    if (!mods.data?.length) return bundledCatalog();
    return mods.data.map((m) => ({
      id: m.id, title: m.title_fr, subtitle: m.subtitle_fr, tier: m.tier,
      lessons: (lessons.data ?? []).filter((l) => l.module_id === m.id).map((l) => ({
        id: l.id, moduleId: l.module_id, position: l.position, title: l.title_fr, objective: l.objective_fr,
        difficulty: l.difficulty, estMinutes: l.est_minutes, kind: l.kind,
      })),
    }));
  } catch {
    return bundledCatalog();
  }
}

const memory = new Map<string, Lesson>();

/** Contenu complet d'une leçon. Pour le Premium, c'est la base (RLS) qui décide de l'accès. */
export async function loadLesson(id: string, catalog: ModuleMeta[]): Promise<Lesson> {
  const meta = catalog.flatMap((m) => m.lessons).find((l) => l.id === id);
  const tier = catalog.find((m) => m.id === meta?.moduleId)?.tier;
  const local = bundledLessons.get(id);
  if (memory.has(id)) return memory.get(id)!;
  if (!supabase) {
    if (local) return local;
    if (tier === 'premium') throw new AppError('premium_required', 'Cette leçon fait partie de l’offre Premium.');
    throw new AppError('load', 'Leçon introuvable.');
  }
  try {
    const { data, error } = await supabase.from('lesson_contents').select('content').eq('lesson_id', id).maybeSingle();
    if (error) throw error;
    if (!data) {
      if (tier === 'premium') throw new AppError('premium_required', 'Cette leçon fait partie de l’offre Premium.');
      if (local) return local;
      throw new AppError('load', 'Leçon introuvable.');
    }
    if (!meta) throw new AppError('load', 'Leçon introuvable.');
    const c = data.content as Pick<Lesson, 'steps' | 'exercises' | 'summary'>;
    const lesson: Lesson = { ...meta, steps: c.steps ?? [], exercises: c.exercises ?? [], summary: c.summary ?? [] };
    if (tier === 'premium') memory.set(id, lesson); // jamais persisté : effacé à la fermeture
    return lesson;
  } catch (e) {
    if (e instanceof AppError) throw e;
    if (local) return local; // hors ligne : version embarquée des leçons gratuites
    throw toAppError(e, 'load');
  }
}

export function clearPremiumCache(): void {
  memory.clear();
}

// ── Texte coranique de référence ─────────────────────────────────────
export interface QuranText {
  text: string | null;
  label: string;
}
const quranCache = new Map<string, QuranText>();

export function refLabel(r: QuranRef): string {
  const w = r.wordFrom ? (r.wordTo && r.wordTo !== r.wordFrom ? `, mots ${r.wordFrom} à ${r.wordTo}` : `, mot ${r.wordFrom}`) : '';
  return `Sourate ${r.surah}, verset ${r.ayah}${w}`;
}

export async function loadQuran(ref: QuranRef): Promise<QuranText> {
  const key = JSON.stringify(ref);
  if (quranCache.has(key)) return quranCache.get(key)!;
  const label = refLabel(ref);
  if (!supabase) return { text: null, label };
  let text: string | null = null;
  if (ref.wordFrom) {
    const { data } = await supabase.from('quran_words').select('word_index, text').eq('surah', ref.surah).eq('ayah', ref.ayah)
      .gte('word_index', ref.wordFrom).lte('word_index', ref.wordTo ?? ref.wordFrom).order('word_index');
    text = data?.length ? data.map((w) => w.text).join(' ') : null;
  } else {
    const { data } = await supabase.from('quran_ayat').select('text_uthmani, text_simple').eq('surah', ref.surah).eq('ayah', ref.ayah).maybeSingle();
    text = data?.text_uthmani ?? data?.text_simple ?? null;
  }
  const result = { text, label };
  if (text) quranCache.set(key, result);
  return result;
}

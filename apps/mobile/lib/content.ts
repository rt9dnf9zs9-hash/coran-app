import type { Lesson, Module, QuranRef } from '@coran/core';
import freeContent from '../content/free-content.json';
import { supabase } from './supabase';

export type LessonMeta = Omit<Lesson, 'steps' | 'exercises' | 'summary'>;
export type ModuleMeta = Omit<Module, 'lessons'> & { lessons: LessonMeta[] };

const bundled = freeContent as unknown as { modules: Module[]; premiumModules: ModuleMeta[] };
const local = new Map(bundled.modules.flatMap((m) => m.lessons.map((l) => [l.id, l] as const)));
const strip = ({ steps: _a, exercises: _b, summary: _c, ...meta }: Lesson): LessonMeta => meta;

export const CATALOG: ModuleMeta[] = [...bundled.modules.map((m) => ({ ...m, lessons: m.lessons.map(strip) })), ...bundled.premiumModules];

export class PremiumRequired extends Error {}

export async function loadLesson(id: string): Promise<Lesson> {
  const meta = CATALOG.flatMap((m) => m.lessons).find((l) => l.id === id);
  const tier = CATALOG.find((m) => m.id === meta?.moduleId)?.tier;
  if (supabase) {
    try {
      const { data, error } = await supabase.from('lesson_contents').select('content').eq('lesson_id', id).maybeSingle();
      if (error) throw error;
      if (data && meta) return { ...meta, ...(data.content as Pick<Lesson, 'steps' | 'exercises' | 'summary'>) };
      if (!data && tier === 'premium') throw new PremiumRequired();
    } catch (e) {
      if (e instanceof PremiumRequired) throw e;
      // hors ligne : repli sur la version embarquée des leçons gratuites
    }
  }
  const l = local.get(id);
  if (l) return l;
  if (tier === 'premium') throw new PremiumRequired();
  throw new Error('Leçon introuvable');
}

export async function loadQuran(ref: QuranRef): Promise<string | null> {
  if (!supabase) return null;
  if (ref.wordFrom) {
    const { data } = await supabase.from('quran_words').select('text').eq('surah', ref.surah).eq('ayah', ref.ayah).gte('word_index', ref.wordFrom).lte('word_index', ref.wordTo ?? ref.wordFrom).order('word_index');
    return data?.length ? data.map((w) => w.text).join(' ') : null;
  }
  const { data } = await supabase.from('quran_ayat').select('text_uthmani, text_simple').eq('surah', ref.surah).eq('ayah', ref.ayah).maybeSingle();
  return data?.text_uthmani ?? data?.text_simple ?? null;
}

const assets = new Map<string, string | null>();
export async function audioUrl(key: string): Promise<string | null> {
  if (!supabase) return null;
  if (assets.has(key)) return assets.get(key)!;
  const { data } = await supabase.from('audio_assets').select('bucket, storage_path').eq('key', key).maybeSingle();
  if (!data) {
    assets.set(key, null);
    return null;
  }
  const url = data.bucket === 'audio-public'
    ? supabase.storage.from(data.bucket).getPublicUrl(data.storage_path).data.publicUrl
    : (await supabase.storage.from(data.bucket).createSignedUrl(data.storage_path, 3600)).data?.signedUrl ?? null;
  if (data.bucket === 'audio-public') assets.set(key, url);
  return url;
}

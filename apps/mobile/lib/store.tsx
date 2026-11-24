import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyAttempt, grade, markStarted, newCard, type LessonProgress, type ReviewCard } from '@coran/core';
import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { configurePurchases, logoutPurchases } from './purchases';
import { supabase } from './supabase';

type Pending = { lessonId: string; correct: number; total: number; missed: string[] };
interface Store {
  ready: boolean;
  session: Session | null;
  premium: boolean;
  progress: Record<string, LessonProgress>;
  cards: ReviewCard[];
  arabicScale: number;
  setArabicScale(v: number): void;
  touch(lessonId: string, step: number): void;
  submit(lessonId: string, correct: number, total: number, missed: string[]): Promise<LessonProgress>;
  gradeCard(key: string, r: 'good' | 'again'): void;
  refreshEntitlement(): Promise<boolean>;
  signOut(): Promise<void>;
}
const Ctx = createContext<Store | null>(null);
export const useStore = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore hors StoreProvider');
  return s;
};

const KEYS = { progress: 'progress', cards: 'cards', pending: 'pending', scale: 'arabicScale' };
async function load<T>(k: string, fb: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : fb;
  } catch {
    return fb;
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [premium, setPremium] = useState(false);
  const [progress, setProgress] = useState<Record<string, LessonProgress>>({});
  const [cards, setCards] = useState<ReviewCard[]>([]);
  const [arabicScale, setArabicScale] = useState(1.4);
  const pending = useRef<Pending[]>([]);

  useEffect(() => {
    (async () => {
      setProgress(await load(KEYS.progress, {}));
      setCards(await load(KEYS.cards, []));
      setArabicScale(await load(KEYS.scale, 1.4));
      pending.current = await load(KEYS.pending, []);
      if (supabase) setSession((await supabase.auth.getSession()).data.session);
      setReady(true);
    })();
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => { if (ready) void AsyncStorage.setItem(KEYS.progress, JSON.stringify(progress)); }, [progress, ready]);
  useEffect(() => { if (ready) void AsyncStorage.setItem(KEYS.cards, JSON.stringify(cards)); }, [cards, ready]);
  useEffect(() => { if (ready) void AsyncStorage.setItem(KEYS.scale, JSON.stringify(arabicScale)); }, [arabicScale, ready]);

  const refreshEntitlement = useCallback(async () => {
    if (!supabase || !session) {
      setPremium(false);
      return false;
    }
    const { data } = await supabase.rpc('my_entitlement');
    const p = !!data?.premium;
    setPremium(p);
    return p;
  }, [session]);

  const flush = useCallback(async () => {
    if (!supabase || !session) return;
    const rest: Pending[] = [];
    for (const p of pending.current) {
      const { error } = await supabase.rpc('record_attempt', { p_lesson: p.lessonId, p_correct: p.correct, p_total: p.total, p_missed: p.missed });
      if (error && !/premium_required|incomplete_attempt|invalid/.test(error.message)) rest.push(p);
    }
    pending.current = rest;
    await AsyncStorage.setItem(KEYS.pending, JSON.stringify(rest));
  }, [session]);

  // Connexion : RevenueCat, droits, progression du compte, fusion de l'appareil.
  useEffect(() => {
    if (!supabase || !session) return;
    const uid = session.user.id;
    (async () => {
      await configurePurchases(uid).catch(() => undefined);
      const local = Object.values(await load<Record<string, LessonProgress>>(KEYS.progress, {}));
      if (local.length) await supabase!.rpc('import_guest_progress', { p_items: local.map((p) => ({ lessonId: p.lessonId, stepIndex: p.stepIndex, bestScore: p.bestScore, attempts: p.attempts })) });
      const { data } = await supabase!.from('user_progress').select('*');
      if (data) setProgress(Object.fromEntries(data.map((r) => [r.lesson_id, { lessonId: r.lesson_id, status: r.status, bestScore: Number(r.best_score), attempts: r.attempts, stepIndex: r.step_index, updatedAt: r.updated_at, completedAt: r.completed_at }])));
      await refreshEntitlement();
      await flush();
    })().catch(() => undefined);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && void refreshEntitlement().then(flush));
    return () => sub.remove();
  }, [session, refreshEntitlement, flush]);

  const touch = useCallback((lessonId: string, step: number) => {
    setProgress((p) => ({ ...p, [lessonId]: markStarted(p[lessonId], lessonId, step) }));
    if (supabase && session) void supabase.rpc('touch_lesson', { p_lesson: lessonId, p_step: step });
  }, [session]);

  const submit = useCallback(async (lessonId: string, correct: number, total: number, missed: string[]) => {
    const local = applyAttempt(progress[lessonId], lessonId, { correct, total });
    setProgress((p) => ({ ...p, [lessonId]: local }));
    setCards((cs) => {
      const map = new Map(cs.map((c) => [c.key, c]));
      for (const k of missed) map.set(k, { ...grade(map.get(k) ?? newCard(k), 'again'), due: new Date().toISOString() });
      return [...map.values()];
    });
    if (supabase && session) {
      const { error } = await supabase.rpc('record_attempt', { p_lesson: lessonId, p_correct: correct, p_total: total, p_missed: missed });
      if (error) {
        if (/premium_required/.test(error.message)) throw error;
        pending.current.push({ lessonId, correct, total, missed });
        await AsyncStorage.setItem(KEYS.pending, JSON.stringify(pending.current));
      }
    }
    return local;
  }, [progress, session]);

  const gradeCard = useCallback((key: string, r: 'good' | 'again') => setCards((cs) => cs.map((c) => (c.key === key ? grade(c, r) : c))), []);

  const signOut = useCallback(async () => {
    await flush();
    await logoutPurchases();
    await supabase?.auth.signOut();
    setPremium(false);
  }, [flush]);

  const value = useMemo(() => ({ ready, session, premium, progress, cards, arabicScale, setArabicScale, touch, submit, gradeCard, refreshEntitlement, signOut }),
    [ready, session, premium, progress, cards, arabicScale, touch, submit, gradeCard, refreshEntitlement, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

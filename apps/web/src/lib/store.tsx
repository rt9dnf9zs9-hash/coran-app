import {
  applyAttempt, grade, LETTERS, markStarted, mergeProgress, newCard, withContrastSiblings,
  type LessonProgress, type ReviewCard,
} from '@coran/core';
import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { bundledCatalog, clearPremiumCache, fetchCatalog, type ModuleMeta } from './content';
import { messageOf } from './errors';
import { local } from './storage';
import { supabase } from './supabase';

export interface Settings {
  dailyGoalMin: number;
  arabicFont: 'amiri' | 'scheherazade';
  arabicScale: number;
  textScale: number;
  translitMode: 'always' | 'progressive' | 'hidden';
  audioRate: 0.5 | 0.75 | 1;
  autoplay: boolean;
  theme: 'light' | 'dark' | 'system';
  onboarding: { done: boolean; knowsAlphabet?: string; goal?: string; startModule?: number };
  ageBracket?: 'under15' | '15_17' | '18_plus';
}

export interface Entitlement {
  premium: boolean;
  expiresAt: string | null;
  provider: string | null;
  cancelAtPeriodEnd: boolean;
}

type QueueItem =
  | { t: 'touch'; lessonId: string; step: number }
  | { t: 'attempt'; lessonId: string; correct: number; total: number; missed: string[] }
  | { t: 'study'; seconds: number; day: string };

const DEFAULT_SETTINGS: Settings = {
  dailyGoalMin: 10, arabicFont: 'amiri', arabicScale: 1.4, textScale: 1, translitMode: 'progressive',
  audioRate: 1, autoplay: true, theme: 'system', onboarding: { done: false },
};
const NO_ENTITLEMENT: Entitlement = { premium: false, expiresAt: null, provider: null, cancelAtPeriodEnd: false };
const FAMILIES: Record<string, string[]> = LETTERS.reduce((acc, l) => {
  (acc[l.family] ??= []).push(l.id);
  return acc;
}, {} as Record<string, string[]>);
const today = () => new Date().toISOString().slice(0, 10);

interface Store {
  ready: boolean;
  backend: boolean;
  session: Session | null;
  userId: string | null;
  email: string | null;
  isAdmin: boolean;
  settings: Settings;
  entitlement: Entitlement;
  catalog: ModuleMeta[];
  progress: Record<string, LessonProgress>;
  cards: ReviewCard[];
  studyDays: Record<string, number>;
  online: boolean;
  pendingSync: number;
  syncError: string | null;
  toast: string | null;
  showToast(msg: string): void;
  updateSettings(p: Partial<Settings>): Promise<void>;
  touchLesson(lessonId: string, step: number): void;
  submitAttempt(lessonId: string, correct: number, total: number, missedKeys: string[]): Promise<LessonProgress>;
  gradeCard(key: string, result: 'good' | 'again'): void;
  logStudy(seconds: number): void;
  refreshEntitlement(): Promise<Entitlement>;
  refreshCatalog(): Promise<void>;
  syncNow(): Promise<void>;
  signOut(): Promise<void>;
}

const Ctx = createContext<Store | null>(null);
export const useStore = (): Store => {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore hors AppProvider');
  return s;
};

const k = (uid: string | null, name: string) => `${uid ? `u:${uid}` : 'guest'}:${name}`;

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const userId = session?.user.id ?? null;
  const [isAdmin, setIsAdmin] = useState(false);
  const [settings, setSettings] = useState<Settings>(() => ({ ...DEFAULT_SETTINGS, ...local.get<Partial<Settings>>('settings', {}) }));
  const [entitlement, setEntitlement] = useState<Entitlement>(NO_ENTITLEMENT);
  const [catalog, setCatalog] = useState<ModuleMeta[]>(bundledCatalog);
  const [progress, setProgress] = useState<Record<string, LessonProgress>>(() => local.get(k(null, 'progress'), {}));
  const [cards, setCards] = useState<ReviewCard[]>(() => local.get(k(null, 'cards'), []));
  const [studyDays, setStudyDays] = useState<Record<string, number>>(() => local.get(k(null, 'days'), {}));
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [queue, setQueue] = useState<QueueItem[]>(() => local.get('sync:queue', []));
  const [syncError, setSyncError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const uidRef = useRef<string | null>(null);
  uidRef.current = userId;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 3500);
  }, []);

  // Apparence (thème, polices, tailles)
  useEffect(() => {
    const root = document.documentElement;
    const dark = settings.theme === 'dark' || (settings.theme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
    root.dataset.theme = dark ? 'dark' : 'light';
    root.dataset.arfont = settings.arabicFont;
    root.style.setProperty('--ar-scale', String(settings.arabicScale));
    root.style.setProperty('--text-scale', String(settings.textScale));
    local.set('settings', settings);
  }, [settings]);

  // Persistance locale (sert aussi de cache hors ligne pour un compte connecté)
  useEffect(() => local.set(k(userId, 'progress'), progress), [progress, userId]);
  useEffect(() => local.set(k(userId, 'cards'), cards), [cards, userId]);
  useEffect(() => local.set(k(userId, 'days'), studyDays), [studyDays, userId]);
  useEffect(() => local.set('sync:queue', queue), [queue]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  // ── Session ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') window.location.hash = '/auth/nouveau-mot-de-passe';
      if (event === 'SIGNED_OUT') {
        clearPremiumCache();
        setEntitlement(NO_ENTITLEMENT);
        setIsAdmin(false);
        setProgress(local.get(k(null, 'progress'), {}));
        setCards(local.get(k(null, 'cards'), []));
        setStudyDays(local.get(k(null, 'days'), {}));
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const refreshEntitlement = useCallback(async (): Promise<Entitlement> => {
    if (!supabase || !uidRef.current) {
      setEntitlement(NO_ENTITLEMENT);
      return NO_ENTITLEMENT;
    }
    const { data, error } = await supabase.rpc('my_entitlement');
    if (error) throw error;
    const e: Entitlement = { premium: !!data?.premium, expiresAt: data?.expires_at ?? null, provider: data?.provider ?? null, cancelAtPeriodEnd: !!data?.cancel_at_period_end };
    setEntitlement((prev) => {
      if (prev.premium && !e.premium) clearPremiumCache();
      return e;
    });
    return e;
  }, []);

  const refreshCatalog = useCallback(async () => setCatalog(await fetchCatalog()), []);

  // Chargement des données du compte + fusion de la progression invité
  useEffect(() => {
    if (!supabase) return;
    void refreshCatalog();
    if (!userId) return;
    let alive = true;
    (async () => {
      const db = supabase!;
      // 1. Fusion invité → compte (une seule fois)
      const guestProgress = local.get<Record<string, LessonProgress>>(k(null, 'progress'), {});
      const guestCards = local.get<ReviewCard[]>(k(null, 'cards'), []);
      if (Object.keys(guestProgress).length) {
        const items = Object.values(guestProgress).map((p) => ({ lessonId: p.lessonId, stepIndex: p.stepIndex, bestScore: p.bestScore, attempts: p.attempts }));
        const { error } = await db.rpc('import_guest_progress', { p_items: items });
        if (!error) {
          local.remove(k(null, 'progress'));
          showToast('Votre progression en mode découverte a été ajoutée à votre compte.');
        }
      }
      if (guestCards.length) {
        const { error } = await db.from('review_schedule').upsert(guestCards.map((c) => cardRow(userId, c)), { onConflict: 'user_id,key', ignoreDuplicates: true });
        if (!error) local.remove(k(null, 'cards'));
      }
      // 2. Données du compte (le cache local s'affiche pendant le chargement)
      setProgress(local.get(k(userId, 'progress'), {}));
      setCards(local.get(k(userId, 'cards'), []));
      const [prog, rev, prof, days, roles] = await Promise.all([
        db.from('user_progress').select('*'),
        db.from('review_schedule').select('*'),
        db.from('profiles').select('*').eq('id', userId).maybeSingle(),
        db.from('study_days').select('day, seconds').gte('day', new Date(Date.now() - 400 * 86400_000).toISOString().slice(0, 10)),
        db.from('user_roles').select('role'),
      ]);
      if (!alive) return;
      if (prog.data) {
        const remote: Record<string, LessonProgress> = {};
        for (const r of prog.data) {
          remote[r.lesson_id] = { lessonId: r.lesson_id, status: r.status, bestScore: Number(r.best_score), attempts: r.attempts, stepIndex: r.step_index, updatedAt: r.updated_at, completedAt: r.completed_at };
        }
        setProgress((localP) => {
          const merged = { ...remote };
          for (const [id, p] of Object.entries(localP)) merged[id] = merged[id] ? mergeProgress(merged[id]!, p) : p;
          return merged;
        });
      }
      if (rev.data) setCards(rev.data.map((r) => ({ key: r.key, ease: Number(r.ease), intervalDays: r.interval_days, reps: r.reps, lapses: r.lapses, due: r.due, lastResult: r.last_result ?? undefined })));
      if (days.data) setStudyDays(Object.fromEntries(days.data.map((d) => [d.day, d.seconds])));
      if (roles.data) setIsAdmin(roles.data.some((r) => r.role === 'admin' || r.role === 'editor'));
      if (prof.data) {
        setSettings((s) => ({
          ...s,
          dailyGoalMin: prof.data.daily_goal_min, arabicFont: prof.data.arabic_font, arabicScale: Number(prof.data.arabic_scale),
          translitMode: prof.data.translit_mode, audioRate: Number(prof.data.audio_rate) as Settings['audioRate'],
          ageBracket: prof.data.age_bracket ?? s.ageBracket,
          onboarding: Object.keys(prof.data.onboarding ?? {}).length ? prof.data.onboarding : s.onboarding,
        }));
      }
      await refreshEntitlement().catch(() => undefined);
    })().catch((e) => alive && setSyncError(messageOf(e, 'sync')));
    return () => {
      alive = false;
    };
  }, [userId, refreshCatalog, refreshEntitlement, showToast]);

  // Rafraîchir les droits quand l'utilisateur revient sur l'onglet (achat sur un autre appareil…)
  useEffect(() => {
    const on = () => document.visibilityState === 'visible' && uidRef.current && refreshEntitlement().catch(() => undefined);
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, [refreshEntitlement]);

  // ── File de synchronisation (hors ligne) ─────────────────────────
  const flushing = useRef(false);
  const syncNow = useCallback(async () => {
    if (!supabase || !uidRef.current || flushing.current) return;
    flushing.current = true;
    try {
      let items = local.get<QueueItem[]>('sync:queue', []);
      while (items.length) {
        const it = items[0]!;
        const res =
          it.t === 'touch' ? await supabase.rpc('touch_lesson', { p_lesson: it.lessonId, p_step: it.step })
          : it.t === 'attempt' ? await supabase.rpc('record_attempt', { p_lesson: it.lessonId, p_correct: it.correct, p_total: it.total, p_missed: it.missed })
          : await supabase.rpc('log_study', { p_seconds: it.seconds, p_day: it.day });
        if (res.error) {
          const msg = res.error.message ?? '';
          // Erreur définitive (droits, données invalides) : on abandonne cet élément.
          if (/premium_required|incomplete_attempt|invalid|lesson_without/.test(msg)) {
            items = items.slice(1);
            local.set('sync:queue', items);
            continue;
          }
          throw res.error;
        }
        items = items.slice(1);
        local.set('sync:queue', items);
        setQueue(items);
      }
      setSyncError(null);
    } catch (e) {
      setSyncError(messageOf(e, 'sync'));
    } finally {
      flushing.current = false;
      setQueue(local.get('sync:queue', []));
    }
  }, []);

  useEffect(() => {
    if (online && userId && queue.length) void syncNow();
  }, [online, userId, queue.length, syncNow]);

  const enqueue = useCallback((item: QueueItem) => {
    if (!uidRef.current || !supabase) return;
    setQueue((q) => {
      // Les reprises de lecture successives d'une même leçon se remplacent.
      const filtered = item.t === 'touch' ? q.filter((x) => !(x.t === 'touch' && x.lessonId === item.lessonId)) : q;
      const next = [...filtered, item];
      local.set('sync:queue', next);
      return next;
    });
  }, []);

  // ── Actions ──────────────────────────────────────────────────────
  const touchLesson = useCallback((lessonId: string, step: number) => {
    setProgress((p) => ({ ...p, [lessonId]: markStarted(p[lessonId], lessonId, step) }));
    enqueue({ t: 'touch', lessonId, step });
  }, [enqueue]);

  const syncCards = useRef<number | undefined>(undefined);
  const scheduleCardSync = useCallback((next: ReviewCard[]) => {
    if (!supabase || !uidRef.current) return;
    window.clearTimeout(syncCards.current);
    syncCards.current = window.setTimeout(() => {
      const uid = uidRef.current;
      if (!uid) return;
      supabase!.from('review_schedule').upsert(next.map((c) => cardRow(uid, c)), { onConflict: 'user_id,key' })
        .then(({ error }) => error && setSyncError(messageOf(error, 'sync')));
    }, 1500);
  }, []);

  const addMistakes = useCallback((keys: string[]) => {
    if (!keys.length) return;
    setCards((cs) => {
      const map = new Map(cs.map((c) => [c.key, c]));
      for (const key of keys) {
        for (const kk of withContrastSiblings(key, FAMILIES)) {
          const existing = map.get(kk);
          // Une erreur en leçon est révisable tout de suite dans l'onglet Révisions.
          map.set(kk, kk === key ? { ...grade(existing ?? newCard(kk), 'again'), due: new Date().toISOString() } : existing ?? newCard(kk));
        }
      }
      const next = [...map.values()];
      scheduleCardSync(next);
      return next;
    });
  }, [scheduleCardSync]);

  const submitAttempt = useCallback(async (lessonId: string, correct: number, total: number, missedKeys: string[]) => {
    const optimistic = applyAttempt(progress[lessonId], lessonId, { correct, total });
    setProgress((p) => ({ ...p, [lessonId]: applyAttempt(p[lessonId], lessonId, { correct, total }) }));
    addMistakes(missedKeys);
    if (supabase && uidRef.current) {
      if (navigator.onLine) {
        const { data, error } = await supabase.rpc('record_attempt', { p_lesson: lessonId, p_correct: correct, p_total: total, p_missed: missedKeys });
        if (error) {
          if (/premium_required/.test(error.message)) throw error;
          enqueue({ t: 'attempt', lessonId, correct, total, missed: missedKeys });
        } else if (data) {
          const r = data as { status: LessonProgress['status']; best_score: number; attempts: number; updated_at: string; completed_at: string | null };
          const server: LessonProgress = { lessonId, status: r.status, bestScore: Number(r.best_score), attempts: r.attempts, stepIndex: 0, updatedAt: r.updated_at, completedAt: r.completed_at };
          setProgress((p) => ({ ...p, [lessonId]: server }));
          return server;
        }
      } else {
        enqueue({ t: 'attempt', lessonId, correct, total, missed: missedKeys });
      }
    }
    return optimistic;
  }, [progress, addMistakes, enqueue]);

  const gradeCard = useCallback((key: string, result: 'good' | 'again') => {
    setCards((cs) => {
      const next = cs.map((c) => (c.key === key ? grade(c, result) : c));
      scheduleCardSync(next);
      return next;
    });
  }, [scheduleCardSync]);

  const logStudy = useCallback((seconds: number) => {
    if (seconds <= 0) return;
    const d = today();
    setStudyDays((s) => ({ ...s, [d]: (s[d] ?? 0) + seconds }));
    enqueue({ t: 'study', seconds: Math.round(seconds), day: d });
  }, [enqueue]);

  const updateSettings = useCallback(async (p: Partial<Settings>) => {
    setSettings((s) => ({ ...s, ...p }));
    if (supabase && uidRef.current) {
      const row: Record<string, unknown> = {};
      if (p.dailyGoalMin !== undefined) row.daily_goal_min = p.dailyGoalMin;
      if (p.arabicFont) row.arabic_font = p.arabicFont;
      if (p.arabicScale !== undefined) row.arabic_scale = p.arabicScale;
      if (p.translitMode) row.translit_mode = p.translitMode;
      if (p.audioRate !== undefined) row.audio_rate = p.audioRate;
      if (p.onboarding) row.onboarding = p.onboarding;
      if (p.ageBracket) row.age_bracket = p.ageBracket;
      if (Object.keys(row).length) {
        const { error } = await supabase.from('profiles').update(row).eq('id', uidRef.current);
        if (error) setSyncError(messageOf(error, 'sync'));
      }
    }
  }, []);

  const signOut = useCallback(async () => {
    await syncNow();
    await supabase?.auth.signOut();
    window.location.hash = '/';
  }, [syncNow]);

  const value = useMemo<Store>(() => ({
    ready, backend: !!supabase, session, userId, email: session?.user.email ?? null, isAdmin, settings, entitlement, catalog,
    progress, cards, studyDays, online, pendingSync: queue.length, syncError, toast, showToast, updateSettings, touchLesson,
    submitAttempt, gradeCard, logStudy, refreshEntitlement, refreshCatalog, syncNow, signOut,
  }), [ready, session, userId, isAdmin, settings, entitlement, catalog, progress, cards, studyDays, online, queue.length, syncError, toast,
    showToast, updateSettings, touchLesson, submitAttempt, gradeCard, logStudy, refreshEntitlement, refreshCatalog, syncNow, signOut]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function cardRow(uid: string, c: ReviewCard) {
  return { user_id: uid, key: c.key, ease: c.ease, interval_days: c.intervalDays, reps: c.reps, lapses: c.lapses, due: c.due, last_result: c.lastResult ?? null, updated_at: new Date().toISOString() };
}

/** Série de jours consécutifs, avec 2 jours de pause tolérés par semaine glissante. */
export function streakOf(days: Record<string, number>): number {
  let streak = 0;
  let pauses = 0;
  const d = new Date();
  if (!days[d.toISOString().slice(0, 10)]) d.setDate(d.getDate() - 1); // aujourd'hui pas encore commencé
  for (let i = 0; i < 400; i++) {
    const key = d.toISOString().slice(0, 10);
    if ((days[key] ?? 0) > 0) {
      streak++;
    } else if (streak > 0 && pauses < 2) {
      pauses++;
    } else {
      break;
    }
    if (i % 7 === 6) pauses = 0;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

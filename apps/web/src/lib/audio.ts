import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';

// Table de correspondance clé audio → fichier (table audio_assets). Aucun son n'est simulé :
// si l'enregistrement n'existe pas, l'interface l'indique.
type Asset = { bucket: string; path: string };
let assetsPromise: Promise<Map<string, Asset>> | null = null;

function loadAssets(): Promise<Map<string, Asset>> {
  if (!supabase) return Promise.resolve(new Map());
  assetsPromise ??= (async () => {
    const { data, error } = await supabase!.from('audio_assets').select('key, bucket, storage_path');
    if (error) {
      assetsPromise = null; // réessai au prochain appel
      throw error;
    }
    return new Map((data ?? []).map((a) => [a.key, { bucket: a.bucket, path: a.storage_path }]));
  })();
  return assetsPromise;
}

export function invalidateAudioAssets(): void {
  assetsPromise = null;
}

const urlCache = new Map<string, { url: string; expires: number }>();

/** URL de lecture, ou null si aucun enregistrement n'existe pour cette clé. */
export async function resolveAudio(key: string): Promise<string | null> {
  const cached = urlCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.url;
  const asset = (await loadAssets()).get(key);
  if (!asset || !supabase) return null;
  if (asset.bucket === 'audio-public') {
    const url = supabase.storage.from(asset.bucket).getPublicUrl(asset.path).data.publicUrl;
    urlCache.set(key, { url, expires: Number.MAX_SAFE_INTEGER });
    return url;
  }
  const { data, error } = await supabase.storage.from(asset.bucket).createSignedUrl(asset.path, 3600);
  if (error || !data) throw error ?? new Error('signed url');
  urlCache.set(key, { url: data.signedUrl, expires: Date.now() + 50 * 60_000 });
  return data.signedUrl;
}

export type AudioStatus = 'idle' | 'loading' | 'ready' | 'playing' | 'unavailable' | 'error';

// Un seul lecteur pour toute l'app : un nouveau son arrête le précédent.
let shared: HTMLAudioElement | null = null;
const player = () => (shared ??= typeof Audio !== 'undefined' ? new Audio() : null);

export function useAudio(key: string | undefined, rate = 1) {
  const [status, setStatus] = useState<AudioStatus>(key ? 'loading' : 'unavailable');
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    urlRef.current = null;
    if (!key) {
      setStatus('unavailable');
      return;
    }
    setStatus('loading');
    resolveAudio(key)
      .then((url) => {
        if (!alive) return;
        urlRef.current = url;
        setStatus(url ? 'ready' : 'unavailable');
      })
      .catch(() => alive && setStatus('error'));
    return () => {
      alive = false;
    };
  }, [key]);

  const play = useCallback(async (fromStart = false) => {
    const a = player();
    const url = urlRef.current;
    if (!a || !url) return;
    try {
      if (a.src !== url) {
        a.src = url;
        a.currentTime = 0;
      } else if (fromStart || a.ended) {
        a.currentTime = 0; // sinon : reprise là où la lecture s'était arrêtée
      }
      a.playbackRate = rate;
      a.onended = () => setStatus('ready');
      a.onpause = () => setStatus('ready');
      a.onerror = () => setStatus('error');
      setStatus('playing');
      await a.play();
    } catch {
      setStatus('error');
    }
  }, [rate]);

  const pause = useCallback(() => player()?.pause(), []);
  const retry = useCallback(() => {
    invalidateAudioAssets();
    urlCache.delete(key ?? '');
    setStatus('loading');
    resolveAudio(key ?? '').then((u) => {
      urlRef.current = u;
      setStatus(u ? 'ready' : 'unavailable');
    }).catch(() => setStatus('error'));
  }, [key]);

  useEffect(() => () => {
    const a = player();
    if (a && urlRef.current && a.src === urlRef.current) a.pause();
  }, []);

  return { status, play, pause, retry };
}

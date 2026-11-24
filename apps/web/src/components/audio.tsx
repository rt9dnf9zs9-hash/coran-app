import { useEffect, useRef } from 'react';
import { useAudio } from '../lib/audio';
import { useStore } from '../lib/store';
import { Icon } from './ui';

/** Bouton écouter / répéter. Si l'enregistrement n'existe pas, on l'indique (aucun son simulé). */
export function AudioButton({ audioKey, label = 'Écouter', autoPlay = false, compact = false }: { audioKey?: string; label?: string; autoPlay?: boolean; compact?: boolean }) {
  const { settings, updateSettings } = useStore();
  const { status, play, pause, retry } = useAudio(audioKey, settings.audioRate);
  const played = useRef(false);

  useEffect(() => {
    if (autoPlay && settings.autoplay && status === 'ready' && !played.current) {
      played.current = true;
      void play(true);
    }
  }, [autoPlay, settings.autoplay, status, play]);

  if (status === 'unavailable') {
    return (
      <p className="small muted row" style={{ margin: '.5rem 0 0' }} role="note">
        <Icon name="mute" size={18} /> Enregistrement bientôt disponible.
      </p>
    );
  }
  if (status === 'error') {
    return (
      <div className="row small" role="alert" style={{ marginTop: '.5rem' }}>
        <span style={{ color: 'var(--error)' }}>L’audio n’a pas pu être chargé.</span>
        <button type="button" className="btn ghost" onClick={retry}>Réessayer</button>
      </div>
    );
  }
  const playing = status === 'playing';
  const rates: (0.5 | 0.75 | 1)[] = [1, 0.75];
  return (
    <div className="row" style={{ marginTop: '.5rem' }}>
      <button type="button" className="btn primary" onClick={() => (playing ? pause() : play())} disabled={status === 'loading'} aria-label={playing ? 'Mettre en pause' : label}>
        <Icon name={playing ? 'pause' : 'play'} size={20} /> {compact ? null : playing ? 'Pause' : status === 'loading' ? 'Chargement…' : label}
      </button>
      <button type="button" className="btn icon" onClick={() => play(true)} disabled={status === 'loading'} aria-label="Réécouter depuis le début" title="Répéter">
        <Icon name="replay" size={20} />
      </button>
      {!compact && (
        <div className="row" role="group" aria-label="Vitesse de lecture">
          {rates.map((r) => (
            <button key={r} type="button" className="chip" aria-pressed={settings.audioRate === r} onClick={() => updateSettings({ audioRate: r })}>
              {r === 1 ? '1×' : '0,75×'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

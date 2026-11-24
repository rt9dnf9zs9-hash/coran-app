import { Component, type ButtonHTMLAttributes, type ErrorInfo, type ReactNode } from 'react';

export function Button({ variant = 'secondary', block, busy, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; block?: boolean; busy?: boolean }) {
  const cls = ['btn', variant !== 'secondary' && variant, block && 'block', rest.className].filter(Boolean).join(' ');
  return (
    <button type="button" {...rest} className={cls} aria-busy={busy || undefined} disabled={rest.disabled || busy}>
      {busy ? 'Patientez…' : children}
    </button>
  );
}

export function LinkButton({ href, variant = 'secondary', block, children }: { href: string; variant?: 'primary' | 'secondary' | 'ghost'; block?: boolean; children: ReactNode }) {
  return <a href={href} className={['btn', variant !== 'secondary' && variant, block && 'block'].filter(Boolean).join(' ')}>{children}</a>;
}

export function Card({ children, tone, className }: { children: ReactNode; tone?: 'accent' | 'gold' | 'soft' | 'err'; className?: string }) {
  return <div className={['card', tone, className].filter(Boolean).join(' ')}>{children}</div>;
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={label}>
      <div style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="stack" aria-busy="true" aria-label="Chargement">
      {Array.from({ length: lines }, (_, i) => <div key={i} className="skeleton" style={{ height: i === 0 ? 28 : 64 }} />)}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card tone="err">
      <p role="alert" style={{ margin: 0 }}>{message}</p>
      {onRetry && <div style={{ marginTop: '.75rem' }}><Button onClick={onRetry}>Réessayer</Button></div>}
    </Card>
  );
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <Card>
      <h2>{title}</h2>
      <p className="muted">{text}</p>
      {action}
    </Card>
  );
}

/** Filet de sécurité : jamais de page blanche. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  override state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erreur d’interface', error, info.componentStack);
  }
  override render() {
    if (this.state.error) {
      return (
        <main className="main">
          <ErrorState message="Cet écran a rencontré un problème. Votre progression est enregistrée." onRetry={() => this.setState({ error: null })} />
          <p style={{ marginTop: '1rem' }}><a href="#/">Revenir à l’accueil</a></p>
        </main>
      );
    }
    return this.props.children;
  }
}

const PATHS: Record<string, string> = {
  home: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M8 7h7',
  refresh: 'M20 11A8 8 0 0 0 6.3 5.3L4 8M4 4v4h4M4 13a8 8 0 0 0 13.7 5.7L20 16M20 20v-4h-4',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  play: 'M7 4l13 8-13 8z',
  pause: 'M7 4h4v16H7zM13 4h4v16h-4z',
  replay: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5',
  mute: 'M4 9h4l5-4v14l-5-4H4zM17 9l4 6M21 9l-4 6',
  check: 'M5 12l5 5 9-10',
  x: 'M6 6l12 12M18 6L6 18',
  lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
  crown: 'M3 8l4 4 5-7 5 7 4-4-2 11H5z',
  flame: 'M12 3c1 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-4 2-7 2 1 3 3 3 5 1-2 1-6 1-9z',
};
export function Icon({ name, label, size = 24 }: { name: keyof typeof PATHS | string; label?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <path d={PATHS[name] ?? ''} />
    </svg>
  );
}

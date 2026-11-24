import { describeDots, formsOf, LETTER_BY_ID, type QuranRef } from '@coran/core';
import { useEffect, useState } from 'react';
import { loadQuran, type QuranText } from '../lib/content';
import { useStore } from '../lib/store';
import { AudioButton } from './audio';

/** Texte arabe isolé (RTL) même au milieu d'une phrase française. */
export function Ar({ children, size, label }: { children: string; size?: 'lg' | 'xl'; label?: string }) {
  return (
    <span lang="ar" dir="rtl" className={`ar${size ? ` ar-${size}` : ''}`} aria-label={label}>
      {children}
    </span>
  );
}

/** Rend les segments arabes d'un texte français avec la bonne direction et la bonne police. */
export function Mixed({ text }: { text: string }) {
  // Découpe en segments arabes / non arabes ; les espaces restent dans le texte français.
  const parts = text.split(/([\u0600-\u06FF\u0750-\u077F\uFE70-\uFEFF](?:[\u0600-\u06FF\u0750-\u077F\uFE70-\uFEFF\u064B-\u065F\u0670\u0640 ]*[\u0600-\u06FF\u0750-\u077F\uFE70-\uFEFF\u064B-\u065F\u0670])?)/g);
  return (
    <>
      {parts.map((p, i) => (/[\u0600-\u06FF]/.test(p) ? <Ar key={i}>{p}</Ar> : <span key={i}>{p}</span>))}
    </>
  );
}

export function Translit({ text, lessonPosition = 1 }: { text?: string; lessonPosition?: number }) {
  const { settings } = useStore();
  if (!text) return null;
  if (settings.translitMode === 'hidden') return null;
  // Mode progressif : affichée jusqu'au module 4, ensuite masquable d'un geste.
  if (settings.translitMode === 'progressive' && lessonPosition > 4) {
    return <details><summary className="small muted">Afficher la translittération</summary><span className="translit">{text}</span></details>;
  }
  return <span className="translit">{text}</span>;
}

export function LetterCard({ letterId }: { letterId: string }) {
  const l = LETTER_BY_ID[letterId];
  if (!l) return null;
  const f = formsOf(l);
  return (
    <div className="card">
      <div className="spread">
        <div>
          <h3>{l.name} <Ar>{l.nameAr}</Ar></h3>
          <p className="small" style={{ margin: 0 }}>Se transcrit « {l.translit} » — {l.sound}</p>
          <p className="small muted" style={{ margin: 0 }}>{describeDots(l)} · {l.joins ? 'se lie des deux côtés' : 'ne se lie pas à la lettre suivante'} · lettre {l.sun ? 'solaire' : 'lunaire'}</p>
        </div>
        <Ar size="xl" label={`Lettre ${l.name}`}>{f.isolated}</Ar>
      </div>
      <AudioButton audioKey={`letter:${l.id}`} label={`Écouter ${l.name}`} />
    </div>
  );
}

export function FormsTable({ letterId }: { letterId: string }) {
  const l = LETTER_BY_ID[letterId];
  if (!l) return null;
  const f = formsOf(l);
  const cols: [string, string][] = [['Isolée', f.isolated], ['Initiale', f.initial], ['Médiane', f.medial], ['Finale', f.final]];
  return (
    <div className="card">
      <h3>{l.name} <Ar>{l.ar}</Ar></h3>
      <table className="t" aria-label={`Formes de ${l.name}`}>
        <thead><tr>{cols.map(([h]) => <th key={h} scope="col">{h}</th>)}</tr></thead>
        <tbody><tr>{cols.map(([h, v]) => <td key={h} className="center"><Ar size="lg" label={`${l.name}, forme ${h.toLowerCase()}`}>{v}</Ar></td>)}</tr></tbody>
      </table>
    </div>
  );
}

/** Citation coranique : texte lu dans la table de référence (Tanzil), jamais recopié. */
export function QuranQuote({ quranRef, fr }: { quranRef: QuranRef; fr?: string }) {
  const [q, setQ] = useState<QuranText | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    loadQuran(quranRef).then((r) => alive && setQ(r)).catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [quranRef]);
  return (
    <figure className="quran" style={{ margin: 0 }}>
      <div className="small" style={{ color: 'var(--gold-ink)', fontWeight: 700 }}>Citation coranique · {q?.label ?? '…'}</div>
      {q?.text ? (
        <blockquote lang="ar" dir="rtl" className="ar ar-lg" style={{ margin: '.5rem 0', textAlign: 'right' }}>{q.text}</blockquote>
      ) : (
        <p className="small" style={{ margin: '.5rem 0' }}>
          {failed ? 'Le texte n’a pas pu être chargé.' : q ? 'Le texte coranique de référence n’a pas encore été importé dans cette installation (voir le guide de configuration). Référence :' : 'Chargement du texte…'} {q && !q.text && <strong>{q.label}</strong>}
        </p>
      )}
      {fr && <figcaption className="small muted">{fr}</figcaption>}
      <div className="small muted">Texte : Tanzil Project (tanzil.net), lecture de Ḥafṣ ʿan ʿĀṣim.</div>
    </figure>
  );
}

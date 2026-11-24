import type { Letter } from './types.ts';

export const TATWEEL = 'ـ';
export const HARAKAT = {
  fatha: 'َ',
  kasra: 'ِ',
  damma: 'ُ',
  sukun: 'ْ',
  shadda: 'ّ',
  tanwinFath: 'ً',
  tanwinKasr: 'ٍ',
  tanwinDamm: 'ٌ',
} as const;

type L = Omit<Letter, 'sun'> & { sun?: boolean };
const SUN = new Set(['ت', 'ث', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ل', 'ن']);

const RAW: L[] = [
  { id: 'alif', ar: 'ا', name: 'alif', nameAr: 'أَلِف', translit: 'ā', sound: 'pas de son propre : support de la voyelle longue « â » ou de la hamza (attaque de voyelle)', joins: false, dots: 0, dotsPos: 'none', family: 'alif' },
  { id: 'ba', ar: 'ب', name: 'bā’', nameAr: 'بَاء', translit: 'b', sound: '« b » comme dans « bateau »', joins: true, dots: 1, dotsPos: 'below', family: 'ba' },
  { id: 'ta', ar: 'ت', name: 'tā’', nameAr: 'تَاء', translit: 't', sound: '« t » comme dans « table »', joins: true, dots: 2, dotsPos: 'above', family: 'ba' },
  { id: 'tha', ar: 'ث', name: 'thā’', nameAr: 'ثَاء', translit: 'th', sound: '« th » de l’anglais « think » : langue entre les dents, sans voix', joins: true, dots: 3, dotsPos: 'above', family: 'ba' },
  { id: 'jim', ar: 'ج', name: 'jīm', nameAr: 'جِيم', translit: 'j', sound: '« dj » comme dans « djinn »', joins: true, dots: 1, dotsPos: 'below', family: 'jim' },
  { id: 'hha', ar: 'ح', name: 'ḥā’', nameAr: 'حَاء', translit: 'ḥ', sound: '« h » soufflé et serré au milieu de la gorge, comme pour embuer une vitre très fort', joins: true, dots: 0, dotsPos: 'none', family: 'jim' },
  { id: 'kha', ar: 'خ', name: 'khā’', nameAr: 'خَاء', translit: 'kh', sound: '« r » raclé au fond du palais, comme la « jota » espagnole ou le « ch » allemand de « Bach »', joins: true, dots: 1, dotsPos: 'above', family: 'jim' },
  { id: 'dal', ar: 'د', name: 'dāl', nameAr: 'دَال', translit: 'd', sound: '« d » comme dans « dos »', joins: false, dots: 0, dotsPos: 'none', family: 'dal' },
  { id: 'dhal', ar: 'ذ', name: 'dhāl', nameAr: 'ذَال', translit: 'dh', sound: '« th » de l’anglais « this » : langue entre les dents, avec la voix', joins: false, dots: 1, dotsPos: 'above', family: 'dal' },
  { id: 'ra', ar: 'ر', name: 'rā’', nameAr: 'رَاء', translit: 'r', sound: '« r » roulé du bout de la langue, comme en espagnol', joins: false, dots: 0, dotsPos: 'none', family: 'ra' },
  { id: 'zay', ar: 'ز', name: 'zāy', nameAr: 'زَاي', translit: 'z', sound: '« z » comme dans « zéro »', joins: false, dots: 1, dotsPos: 'above', family: 'ra' },
  { id: 'sin', ar: 'س', name: 'sīn', nameAr: 'سِين', translit: 's', sound: '« s » comme dans « sel »', joins: true, dots: 0, dotsPos: 'none', family: 'sin' },
  { id: 'shin', ar: 'ش', name: 'shīn', nameAr: 'شِين', translit: 'sh', sound: '« ch » comme dans « chat »', joins: true, dots: 3, dotsPos: 'above', family: 'sin' },
  { id: 'sad', ar: 'ص', name: 'ṣād', nameAr: 'صَاد', translit: 'ṣ', sound: '« s » emphatique : bouche arrondie, arrière de la langue relevé, son plus grave', joins: true, dots: 0, dotsPos: 'none', family: 'sad' },
  { id: 'dad', ar: 'ض', name: 'ḍād', nameAr: 'ضَاد', translit: 'ḍ', sound: '« d » emphatique, son grave et plein ; lettre réputée propre à l’arabe', joins: true, dots: 1, dotsPos: 'above', family: 'sad' },
  { id: 'tta', ar: 'ط', name: 'ṭā’', nameAr: 'طَاء', translit: 'ṭ', sound: '« t » emphatique : son grave, arrière de la langue relevé', joins: true, dots: 0, dotsPos: 'none', family: 'tta' },
  { id: 'zza', ar: 'ظ', name: 'ẓā’', nameAr: 'ظَاء', translit: 'ẓ', sound: '« th » de « this » prononcé de façon emphatique (grave)', joins: true, dots: 1, dotsPos: 'above', family: 'tta' },
  { id: 'ayn', ar: 'ع', name: 'ʿayn', nameAr: 'عَيْن', translit: 'ʿ', sound: 'contraction sonore du milieu de la gorge ; aucun équivalent en français', joins: true, dots: 0, dotsPos: 'none', family: 'ayn' },
  { id: 'ghayn', ar: 'غ', name: 'ghayn', nameAr: 'غَيْن', translit: 'gh', sound: '« r » grasseyé comme le « r » parisien de « Paris »', joins: true, dots: 1, dotsPos: 'above', family: 'ayn' },
  { id: 'fa', ar: 'ف', name: 'fā’', nameAr: 'فَاء', translit: 'f', sound: '« f » comme dans « fil »', joins: true, dots: 1, dotsPos: 'above', family: 'fa' },
  { id: 'qaf', ar: 'ق', name: 'qāf', nameAr: 'قَاف', translit: 'q', sound: '« k » prononcé très au fond, contre la luette', joins: true, dots: 2, dotsPos: 'above', family: 'fa' },
  { id: 'kaf', ar: 'ك', name: 'kāf', nameAr: 'كَاف', translit: 'k', sound: '« k » comme dans « kilo »', joins: true, dots: 0, dotsPos: 'none', family: 'kaf' },
  { id: 'lam', ar: 'ل', name: 'lām', nameAr: 'لَام', translit: 'l', sound: '« l » comme dans « lune »', joins: true, dots: 0, dotsPos: 'none', family: 'lam' },
  { id: 'mim', ar: 'م', name: 'mīm', nameAr: 'مِيم', translit: 'm', sound: '« m » comme dans « mer »', joins: true, dots: 0, dotsPos: 'none', family: 'mim' },
  { id: 'nun', ar: 'ن', name: 'nūn', nameAr: 'نُون', translit: 'n', sound: '« n » comme dans « nez »', joins: true, dots: 1, dotsPos: 'above', family: 'nun' },
  { id: 'ha', ar: 'ه', name: 'hā’', nameAr: 'هَاء', translit: 'h', sound: '« h » léger et expiré, comme l’anglais « hello »', joins: true, dots: 0, dotsPos: 'none', family: 'ha' },
  { id: 'waw', ar: 'و', name: 'wāw', nameAr: 'وَاو', translit: 'w / ū', sound: '« w » comme dans « watt », ou voyelle longue « oû »', joins: false, dots: 0, dotsPos: 'none', family: 'waw' },
  { id: 'ya', ar: 'ي', name: 'yā’', nameAr: 'يَاء', translit: 'y / ī', sound: '« y » comme dans « yaourt », ou voyelle longue « î »', joins: true, dots: 2, dotsPos: 'below', family: 'ya' },
];

export const LETTERS: Letter[] = RAW.map((l) => ({ ...l, sun: SUN.has(l.ar) }));
export const LETTER_BY_ID: Record<string, Letter> = Object.fromEntries(LETTERS.map((l) => [l.id, l]));

export function letter(id: string): Letter {
  const l = LETTER_BY_ID[id];
  if (!l) throw new Error(`Lettre inconnue : ${id}`);
  return l;
}

export interface LetterForms {
  isolated: string;
  initial: string;
  medial: string;
  final: string;
}

/** Formes contextuelles obtenues par le moteur typographique grâce au tatweel. */
export function formsOf(l: Letter): LetterForms {
  return {
    isolated: l.ar,
    initial: l.joins ? l.ar + TATWEEL : l.ar,
    medial: l.joins ? TATWEEL + l.ar + TATWEEL : TATWEEL + l.ar,
    final: TATWEEL + l.ar,
  };
}

export const NON_JOINING = LETTERS.filter((l) => !l.joins);

const ARABIC_RE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
export function hasArabic(s: string): boolean {
  return ARABIC_RE.test(s);
}

/** Retire les signes diacritiques (pour comparer des squelettes). */
export function stripDiacritics(s: string): string {
  return s.replace(/[ً-ْٰـ]/g, '');
}

export function describeDots(l: Letter): string {
  if (l.dots === 0) return 'aucun point';
  const n = l.dots === 1 ? 'un point' : l.dots === 2 ? 'deux points' : 'trois points';
  const pos = l.dotsPos === 'above' ? 'au-dessus' : l.dotsPos === 'below' ? 'en dessous' : 'à l’intérieur';
  return `${n} ${pos}`;
}

import type { Exercise, Lesson, Module, QuranRef, Step } from '../../core/src/index.ts';
import { seededShuffle } from '../../core/src/index.ts';
import { explain, moduleTest, quick, tip } from './helpers.ts';

export interface Vocab {
  id: string;
  ar: string;
  translit: string;
  fr: string;
  /** racine en lettres séparées ; null si la racine est discutée ou sans objet */
  root: string | null;
  note?: string;
  /** occurrence de référence, à afficher depuis le texte Tanzil importé */
  ref?: QuranRef;
}

const V = (id: string, ar: string, translit: string, fr: string, root: string | null, extra: Partial<Vocab> = {}): Vocab => ({ id, ar, translit, fr, root, ...extra });

export const VOCAB_GROUPS: { title: string; intro: string; words: Vocab[] }[] = [
  {
    title: 'Dieu et ses noms',
    intro: 'Commençons par des mots présents dès la sourate al-Fātiḥa. Une traduction n’est qu’une approche du sens : plusieurs traductions françaises existent pour chacun de ces mots.',
    words: [
      V('allah', 'اللَّه', 'Allāh', 'Dieu', null, { note: 'Nom propre de Dieu. Son origine étymologique est discutée par les grammairiens ; nous ne lui attribuons pas de racine ici.', ref: { surah: 1, ayah: 1, wordFrom: 2, wordTo: 2 } }),
      V('rabb', 'رَبّ', 'rabb', 'Seigneur, Maître', 'ر ب ب', { ref: { surah: 1, ayah: 2, wordFrom: 3, wordTo: 3 } }),
      V('rahman', 'رَحْمَٰن', 'raḥmān', 'le Tout-Miséricordieux (traduction courante)', 'ر ح م', { ref: { surah: 1, ayah: 3, wordFrom: 1, wordTo: 1 } }),
      V('rahim', 'رَحِيم', 'raḥīm', 'le Très-Miséricordieux (traduction courante)', 'ر ح م', { ref: { surah: 1, ayah: 3, wordFrom: 2, wordTo: 2 } }),
      V('hamd', 'حَمْد', 'ḥamd', 'louange', 'ح م د', { ref: { surah: 1, ayah: 2, wordFrom: 1, wordTo: 1 } }),
      V('alim', 'عَلِيم', 'ʿalīm', 'Omniscient, qui sait tout', 'ع ل م'),
    ],
  },
  {
    title: 'La foi et la guidée',
    intro: 'Ces mots reviennent très souvent dans le Coran. Remarquez les racines : elles vous aideront à reconnaître des mots de la même famille.',
    words: [
      V('kitab', 'كِتَاب', 'kitāb', 'livre, écrit', 'ك ت ب', { ref: { surah: 2, ayah: 2 } }),
      V('hudan', 'هُدًى', 'hudan', 'guidée, bonne direction', 'ه د ي', { ref: { surah: 2, ayah: 2 } }),
      V('amana', 'آمَنَ', 'āmana', 'il a cru, il a eu foi', 'ء م ن'),
      V('kafara', 'كَفَرَ', 'kafara', 'il a mécru, il a renié', 'ك ف ر'),
      V('haqq', 'حَقّ', 'ḥaqq', 'vérité, droit', 'ح ق ق'),
      V('din', 'دِين', 'dīn', 'religion ; rétribution (selon le contexte)', 'د ي ن', { ref: { surah: 1, ayah: 4, wordFrom: 3, wordTo: 3 } }),
      V('rasul', 'رَسُول', 'rasūl', 'messager', 'ر س ل'),
      V('aya', 'آيَة', 'āya', 'signe ; verset', 'ء ي ي'),
    ],
  },
  {
    title: 'L’être humain',
    intro: 'Des mots qui décrivent l’intérieur de l’être humain et ses actes.',
    words: [
      V('nafs', 'نَفْس', 'nafs', 'âme, soi, personne', 'ن ف س'),
      V('qalb', 'قَلْب', 'qalb', 'cœur', 'ق ل ب'),
      V('qawm', 'قَوْم', 'qawm', 'peuple, gens', 'ق و م'),
      V('amila', 'عَمِلَ', 'ʿamila', 'il a fait, il a œuvré', 'ع م ل'),
      V('sabara', 'صَبَرَ', 'ṣabara', 'il a été patient, il a enduré', 'ص ب ر'),
      V('dhikr', 'ذِكْر', 'dhikr', 'rappel, évocation', 'ذ ك ر'),
    ],
  },
  {
    title: 'La création',
    intro: 'Le vocabulaire de la création et du monde visible.',
    words: [
      V('khalaqa', 'خَلَقَ', 'khalaqa', 'il a créé', 'خ ل ق'),
      V('ard', 'أَرْض', 'arḍ', 'terre', 'ء ر ض'),
      V('sama', 'سَمَاء', 'samāʾ', 'ciel', 'س م و'),
      V('ma', 'مَاء', 'māʾ', 'eau', 'م و ه'),
      V('yawm', 'يَوْم', 'yawm', 'jour', 'ي و م', { ref: { surah: 1, ayah: 4, wordFrom: 2, wordTo: 2 } }),
      V('shay', 'شَيْء', 'shayʾ', 'chose', 'ش ي ء'),
      V('jaala', 'جَعَلَ', 'jaʿala', 'il a fait, il a placé, il a rendu', 'ج ع ل'),
    ],
  },
  {
    title: 'Le culte et l’au-delà',
    intro: 'Des mots liés à l’adoration et à la vie future.',
    words: [
      V('salah', 'صَلَاة', 'ṣalāh', 'prière', 'ص ل و', { ref: { surah: 2, ayah: 3 }, note: 'Dans le texte coranique, ce mot est souvent écrit avec un wāw : c’est une particularité de la graphie ʿuthmānī.' }),
      V('abada', 'عَبَدَ', 'ʿabada', 'il a adoré', 'ع ب د', { ref: { surah: 1, ayah: 5, wordFrom: 2, wordTo: 2 }, note: 'En 1:5, on trouve la forme نَعْبُدُ (« nous adorons »).' }),
      V('janna', 'جَنَّة', 'janna', 'jardin ; paradis', 'ج ن ن'),
      V('nar', 'نَار', 'nār', 'feu', 'ن و ر'),
      V('adhab', 'عَذَاب', 'ʿadhāb', 'châtiment', 'ع ذ ب'),
      V('sabil', 'سَبِيل', 'sabīl', 'chemin, voie', 'س ب ل'),
    ],
  },
  {
    title: 'Les mots les plus fréquents et les racines',
    intro: 'Une racine est un ensemble de (souvent) trois consonnes porteuses d’un sens général. En changeant les voyelles et en ajoutant des lettres autour, on obtient des mots de la même famille. Connaître une racine, c’est souvent deviner le sens de plusieurs mots.',
    words: [
      V('qala', 'قَالَ', 'qāla', 'il a dit', 'ق و ل', { note: 'Un des verbes les plus fréquents du Coran.' }),
      V('kana', 'كَانَ', 'kāna', 'il était, il fut', 'ك و ن'),
      V('amr', 'أَمْر', 'amr', 'ordre, affaire', 'ء م ر'),
      V('kataba', 'كَتَبَ', 'kataba', 'il a écrit ; il a prescrit', 'ك ت ب'),
      V('katib', 'كَاتِب', 'kātib', 'scribe, celui qui écrit', 'ك ت ب'),
      V('ilm', 'عِلْم', 'ʿilm', 'savoir, science', 'ع ل م'),
      V('alima', 'عَلِمَ', 'ʿalima', 'il a su', 'ع ل م'),
    ],
  },
];

export const VOCABULARY: Vocab[] = VOCAB_GROUPS.flatMap((g) => g.words);

function vocabLesson(g: (typeof VOCAB_GROUPS)[number], i: number): Lesson {
  const id = `m5l${i + 1}`;
  const steps: Step[] = [explain(g.intro)];
  for (const w of g.words) {
    steps.push({ kind: 'example', ar: w.ar, translit: w.translit, fr: w.fr, audio: `word:${w.id}`, note: [w.root ? `Racine : ${w.root}` : null, w.note].filter(Boolean).join(' — ') || undefined });
    if (w.ref) steps.push({ kind: 'quran', ref: w.ref, fr: `Occurrence de « ${w.translit} » dans le Coran.` });
  }
  steps.push(tip('Ajoutez ces mots à vos révisions : ils reviendront automatiquement au bon moment.'));

  const exercises: Exercise[] = [];
  for (const w of g.words) {
    const wrongs = seededShuffle(VOCABULARY.filter((x) => x.id !== w.id && x.fr !== w.fr), `${id}-${w.id}`).slice(0, 3);
    exercises.push(
      quick(`${id}-tr-${w.id}`, 'translate', 'Que signifie ce mot ?', { label: w.fr }, wrongs.map((x) => ({ label: x.fr, why: `« ${x.fr} » se dit ${x.ar} (${x.translit}).` })), `${w.ar} (${w.translit}) signifie « ${w.fr} »${w.root ? ` ; racine ${w.root}` : ''}.`, { ar: w.ar, audio: `word:${w.id}`, reviewKey: `word:${w.id}` }),
    );
  }
  const rooted = g.words.filter((w) => w.root);
  for (const w of rooted.slice(0, 2)) {
    const wrongRoots = seededShuffle([...new Set(VOCABULARY.map((x) => x.root).filter((r): r is string => !!r && r !== w.root))], `${id}-r-${w.id}`).slice(0, 2);
    exercises.push(quick(`${id}-root-${w.id}`, 'mcq', 'Quelle est la racine de ce mot ?', { ar: w.root! }, wrongRoots.map((r) => ({ ar: r, why: `${r} est la racine d’autres mots (${VOCABULARY.filter((x) => x.root === r).map((x) => x.ar).join(', ')}).` })), `La racine de ${w.ar} est ${w.root} : ce sont les consonnes qui restent quand on retire les voyelles et les lettres ajoutées.`, { ar: w.ar, reviewKey: `root:${w.root}` }));
  }
  const four = g.words.slice(0, 4);
  exercises.push({
    id: `${id}-match`, type: 'match', prompt: 'Associez chaque mot à son sens',
    pairs: four.map((w) => ({ left: { id: `l-${w.id}`, ar: w.ar }, right: { id: `r-${w.id}`, label: w.fr } })),
    explanation: four.map((w) => `${w.ar} = ${w.fr}`).join(' · '),
  });
  return {
    id, moduleId: 5, position: i + 1, title: g.title, objective: `Comprendre ${g.words.length} mots fréquents du Coran et leur racine`,
    difficulty: i < 2 ? 1 : 2, estMinutes: 8, kind: 'lesson', steps, exercises,
    summary: g.words.map((w) => `${w.ar} (${w.translit}) : ${w.fr}`),
  };
}

const m5All = VOCAB_GROUPS.map(vocabLesson);
export const module5Lessons = m5All;
export function buildModule5(freeLessons: Lesson[]): Module {
  return {
    id: 5, title: 'Vocabulaire coranique', subtitle: 'Mots fréquents, racines, traductions', tier: 'free',
    lessons: [
      ...m5All,
      moduleTest(5, m5All, 'Test du module 5 : le vocabulaire'),
      moduleTest(5, freeLessons, 'Examen général du parcours gratuit', 1, 'final_exam'),
    ],
  };
}

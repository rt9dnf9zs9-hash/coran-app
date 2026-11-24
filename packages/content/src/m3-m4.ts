import { HARAKAT, letter } from '../../core/src/index.ts';
import type { ChoiceExercise, Exercise, Lesson, Module, OrderExercise } from '../../core/src/index.ts';
import { ex, explain, moduleTest, quick, tip } from './helpers.ts';

const VOW = { a: HARAKAT.fatha, i: HARAKAT.kasra, u: HARAKAT.damma } as const;
type V = keyof typeof VOW;
const VNAME: Record<V, string> = { a: 'fatḥa', i: 'kasra', u: 'ḍamma' };
const consonant = (id: string) => letter(id).translit.split(' ')[0]!;

/** « Comment se lit بِ ? » avec explication sur la voyelle confondue. */
function syllable(prefix: string, id: string, v: V): ChoiceExercise {
  const l = letter(id);
  const c = consonant(id);
  const others = (['a', 'i', 'u'] as V[]).filter((x) => x !== v);
  return quick(
    `${prefix}-syl-${id}-${v}`,
    'syllable',
    'Comment se lit cette syllabe ?',
    { label: c + v },
    others.map((o) => ({ label: c + o, why: `« ${c}${o} » s’écrirait avec une ${VNAME[o]} (${o === 'a' ? 'petit trait au-dessus' : o === 'i' ? 'petit trait en dessous' : 'petit wāw au-dessus'}).` })),
    `${l.ar}${VOW[v]} : la lettre ${l.name} porte une ${VNAME[v]}, on lit « ${c}${v} ».`,
    { ar: l.ar + VOW[v], audio: `syll:${id}-${v}`, reviewKey: `haraka:${v}` },
  );
}

function read(id: string, ar: string, correct: string, wrongs: [string, string][], explanation: string, audio?: string): ChoiceExercise {
  return quick(id, 'fill', 'Comment se lit ce mot ?', { label: correct }, wrongs.map(([label, why]) => ({ label, why })), explanation, {
    ar,
    audio,
    reviewKey: audio ?? `read:${id}`,
  });
}

function order(id: string, word: string, translit: string, pieces: [string, string][]): OrderExercise {
  return {
    id,
    type: 'order',
    prompt: `Reconstituez le mot « ${translit} » syllabe par syllabe (de droite à gauche)`,
    ar: word,
    audio: `word:${translit.replace(/[^a-z]/gi, '').toLowerCase()}`,
    pieces: pieces.map(([ar, label], i) => ({ id: `p${i}`, ar, label })),
    explanation: `${word} = ${pieces.map(([a, t]) => `${a} (${t})`).join(' + ')}. On lit de droite à gauche.`,
  };
}

// ───────────────────────── Module 3 : voyelles et signes ─────────────────────────

const shortVowel = (v: V, pos: number, title: string, text: string, ids: string[], extra: Exercise[] = []): Lesson => ({
  id: `m3l${pos}`, moduleId: 3, position: pos, title, difficulty: 1, estMinutes: 6, kind: 'lesson',
  objective: `Lire une consonne portant une ${VNAME[v]}`,
  steps: [
    explain(text),
    ...ids.map((id) => ex(letter(id).ar + VOW[v], consonant(id) + v, undefined, `syll:${id}-${v}`)),
    tip('Les voyelles brèves ne sont pas des lettres : ce sont de petits signes placés au-dessus ou en dessous de la consonne. Dans le Coran, elles sont toujours écrites.'),
  ],
  exercises: [...ids.map((id) => syllable(`m3l${pos}`, id, v)), ...extra],
  summary: [`${VNAME[v]} = « ${v} » bref.`],
});

const m3l1 = shortVowel('a', 1, 'La fatḥa : le son « a »', 'La fatḥa ( ـَ ) est un petit trait oblique AU-DESSUS de la consonne. Elle se prononce « a » bref.', ['ba', 'ta', 'kaf', 'sin', 'mim']);
const m3l2 = shortVowel('i', 2, 'La kasra : le son « i »', 'La kasra ( ـِ ) est un petit trait oblique EN DESSOUS de la consonne. Elle se prononce « i » bref.', ['ba', 'nun', 'lam', 'fa', 'dal'], [syllable('m3l2r', 'ta', 'a')]);
const m3l3 = shortVowel('u', 3, 'La ḍamma : le son « ou »', 'La ḍamma ( ـُ ) ressemble à un petit wāw placé AU-DESSUS de la consonne. Elle se prononce « ou » bref (transcrit « u »).', ['ba', 'qaf', 'ra', 'ha', 'jim'], [syllable('m3l3r', 'kaf', 'i')]);

const m3l4: Lesson = {
  id: 'm3l4', moduleId: 3, position: 4, title: 'Le sukūn : pas de voyelle', difficulty: 2, estMinutes: 6, kind: 'lesson',
  objective: 'Reconnaître une consonne sans voyelle et lire une syllabe fermée',
  steps: [
    explain('Le sukūn ( ـْ ) est un petit cercle au-dessus de la consonne. Il indique qu’elle ne porte AUCUNE voyelle : elle ferme la syllabe précédente.'),
    ex('مِنْ', 'min', 'de, à partir de', 'word:min'), ex('قُلْ', 'qul', 'dis !', 'word:qul'), ex('لَمْ', 'lam', 'ne… pas (au passé)', 'word:lam'),
    tip('Sukūn = arrêt sur la consonne. Ne rajoutez pas de « e » muet à la française : on dit « min », pas « mine ».'),
  ],
  exercises: [
    read('m3l4-1', 'مِنْ', 'min', [['mina', 'Le sukūn sur ن interdit toute voyelle après lui.'], ['mun', 'م porte une kasra (trait dessous), donc « mi », pas « mu ».']], 'مِ (mi) + نْ (n sans voyelle) = « min ».', 'word:min'),
    read('m3l4-2', 'قُلْ', 'qul', [['qal', 'ق porte une ḍamma (petit wāw), pas une fatḥa.'], ['qulu', 'ل porte un sukūn : aucune voyelle finale.']], 'قُ (qu) + لْ (l) = « qul ».', 'word:qul'),
    read('m3l4-3', 'لَمْ', 'lam', [['lim', 'ل porte une fatḥa (trait au-dessus), donc « la ».'], ['lama', 'م porte un sukūn.']], 'لَ (la) + مْ (m) = « lam ».', 'word:lam'),
    quick('m3l4-4', 'mcq', 'Que signifie le petit cercle ـْ au-dessus d’une lettre ?', { label: 'La lettre ne porte aucune voyelle' }, [
      { label: 'La lettre est doublée', why: 'Le doublement est indiqué par la shadda ( ـّ ), un petit « w » arrondi.' },
      { label: 'Il faut prononcer « o »', why: 'L’arabe classique n’a pas de voyelle « o » : le cercle est le sukūn.' },
    ], 'Le sukūn indique l’absence de voyelle.', { reviewKey: 'haraka:sukun' }),
  ],
  summary: ['Sukūn ( ـْ ) = consonne sans voyelle.', 'Il ferme la syllabe : مِنْ = min.'],
};

const m3l5: Lesson = {
  id: 'm3l5', moduleId: 3, position: 5, title: 'La shadda : la consonne doublée', difficulty: 2, estMinutes: 7, kind: 'lesson',
  objective: 'Prononcer une consonne doublée',
  steps: [
    explain('La shadda ( ـّ ) ressemble à un petit « w » au-dessus de la lettre. Elle indique que la consonne est prononcée deux fois : une première fois sans voyelle, une seconde fois avec la voyelle qui accompagne la shadda.'),
    ex('ثُمَّ', 'thumma', 'ensuite', 'word:thumma'), ex('إِنَّ', 'inna', 'certes', 'word:inna'), ex('رَبّ', 'rabb', 'seigneur', 'word:rabb'),
    tip('Tenez la consonne un peu plus longtemps : « thum-ma », « in-na ». Oublier la shadda peut changer le sens du mot.'),
  ],
  exercises: [
    read('m3l5-1', 'ثُمَّ', 'thumma', [['thuma', 'La shadda sur م impose de la prononcer deux fois : « thum-ma ».'], ['thamma', 'ث porte une ḍamma : « thu ».']], 'ثُ (thu) + مَّ (m-ma) = « thumma ».', 'word:thumma'),
    read('m3l5-2', 'إِنَّ', 'inna', [['ina', 'La shadda double le ن : « in-na ».'], ['anna', 'L’alif porte une hamza avec kasra (en dessous) : « i ».']], 'إِ (i) + نَّ (n-na) = « inna ».', 'word:inna'),
    quick('m3l5-3', 'mcq', 'Que fait la shadda ( ـّ ) ?', { label: 'Elle double la consonne' }, [
      { label: 'Elle allonge la voyelle', why: 'L’allongement des voyelles se fait avec ا و ي (voyelles longues).' },
      { label: 'Elle supprime la voyelle', why: 'C’est le rôle du sukūn ( ـْ ).' },
    ], 'La shadda indique une consonne géminée (prononcée deux fois).', { reviewKey: 'haraka:shadda' }),
    quick('m3l5-4', 'visual', 'Lequel de ces mots contient une shadda ?', { ar: 'ثُمَّ' }, [
      { ar: 'قُلْ', why: 'قُلْ contient un sukūn (petit cercle), pas une shadda.' },
      { ar: 'مِنْ', why: 'مِنْ contient une kasra et un sukūn.' },
    ], 'Dans ثُمَّ, le م porte une shadda surmontée d’une fatḥa.', { reviewKey: 'haraka:shadda' }),
  ],
  summary: ['Shadda ( ـّ ) = consonne doublée.', 'ثُمَّ = thumma, إِنَّ = inna.'],
};

const m3l6: Lesson = {
  id: 'm3l6', moduleId: 3, position: 6, title: 'Le tanwīn : la voyelle suivie de « n »', difficulty: 2, estMinutes: 7, kind: 'lesson',
  objective: 'Lire les trois formes du tanwīn',
  steps: [
    explain('Le tanwīn est une voyelle doublée en fin de mot. Il se prononce comme la voyelle suivie d’un « n » : ـٌ = « un », ـٍ = « in », ـً = « an ». Il marque en général un nom indéfini (« un livre »).'),
    ex('كِتَابٌ', 'kitābun', 'un livre (sujet)', 'word:kitabun'), ex('كِتَابًا', 'kitāban', 'un livre (complément)', 'word:kitaban'), ex('كِتَابٍ', 'kitābin', 'd’un livre (après préposition)', 'word:kitabin'),
    tip('Le tanwīn « an » s’écrit souvent avec un alif muet après lui : كِتَابًا. Cet alif ne se prononce pas.'),
  ],
  exercises: [
    read('m3l6-1', 'كِتَابٌ', 'kitābun', [['kitābin', '« in » s’écrirait avec deux traits en dessous ( ـٍ ).'], ['kitāban', '« an » s’écrirait avec deux traits au-dessus ( ـً ).']], 'Deux ḍamma ( ـٌ ) = « un ».', 'word:kitabun'),
    read('m3l6-2', 'كِتَابًا', 'kitāban', [['kitābā', 'Le tanwīn ajoute un « n » ; l’alif final est muet.'], ['kitābun', '« un » s’écrirait avec une double ḍamma.']], 'Deux fatḥa ( ـً ) = « an », l’alif final ne se prononce pas.', 'word:kitaban'),
    read('m3l6-3', 'كِتَابٍ', 'kitābin', [['kitābi', 'Le tanwīn ajoute un « n » : « in ».'], ['kitābun', '« un » serait une double ḍamma au-dessus.']], 'Deux kasra ( ـٍ ) = « in ».', 'word:kitabin'),
    quick('m3l6-4', 'mcq', 'Comment se prononce ـً ?', { label: '« an »' }, [
      { label: '« a »', why: 'Le tanwīn ajoute toujours un « n ».' },
      { label: '« in »', why: '« in » correspond à ـٍ (deux traits en dessous).' },
    ], 'Double fatḥa = « an ».', { reviewKey: 'haraka:tanwin' }),
  ],
  summary: ['ـٌ = un, ـً = an, ـٍ = in.', 'Le tanwīn marque souvent l’indéfini.'],
};

const m3l7: Lesson = {
  id: 'm3l7', moduleId: 3, position: 7, title: 'Les voyelles longues', difficulty: 2, estMinutes: 7, kind: 'lesson',
  objective: 'Lire ā, ī, ū et les distinguer des voyelles brèves',
  steps: [
    explain('Une voyelle longue s’obtient en faisant suivre une voyelle brève de la lettre correspondante : fatḥa + ا = « ā », kasra + ي = « ī », ḍamma + و = « ū ». Elle dure environ deux fois plus longtemps.'),
    ex('بَا', 'bā'), ex('بِي', 'bī'), ex('بُو', 'bū'),
    ex('قَالَ', 'qāla', 'il a dit', 'word:qala'), ex('دِين', 'dīn', 'religion, rétribution', 'word:din'), ex('نُور', 'nūr', 'lumière', 'word:nur'),
    tip('La longueur change le sens : qala et qāla ne sont pas le même mot. Comptez « deux temps » sur une voyelle longue.'),
  ],
  exercises: [
    read('m3l7-1', 'قَالَ', 'qāla', [['qala', 'L’alif après la fatḥa allonge le « a » : « qā ».'], ['qīla', 'ق porte une fatḥa, pas une kasra.']], 'قَا (qā) + لَ (la) = « qāla ».', 'word:qala'),
    read('m3l7-2', 'نُور', 'nūr', [['nur', 'Le و après la ḍamma allonge le son : « nū ».'], ['nawr', 'Le و ne porte pas de sukūn ici : il sert de voyelle longue.']], 'نُو (nū) + ر = « nūr ».', 'word:nur'),
    read('m3l7-3', 'دِين', 'dīn', [['din', 'Le ي après la kasra allonge le son : « dī ».'], ['dayn', 'د porte une kasra : « di », allongée par ي.']], 'دِي (dī) + ن = « dīn ».', 'word:din'),
    quick('m3l7-4', 'mcq', 'Quelle lettre allonge la kasra ?', { ar: 'ي' }, [
      { ar: 'ا', why: 'ا allonge la fatḥa (« ā »).' },
      { ar: 'و', why: 'و allonge la ḍamma (« ū »).' },
    ], 'kasra + ي = « ī ».', { reviewKey: 'rule:long-vowels' }),
  ],
  summary: ['ـَا = ā, ـِي = ī, ـُو = ū.', 'Une voyelle longue dure deux temps.'],
};

const m3l8: Lesson = {
  id: 'm3l8', moduleId: 3, position: 8, title: 'Initiation au tajwīd : madd, lettres solaires et lunaires', difficulty: 3, estMinutes: 9, kind: 'lesson',
  objective: 'Appliquer trois règles élémentaires de lecture',
  steps: [
    explain('Le tajwīd est l’ensemble des règles de récitation du Coran. C’est un domaine à part entière ; nous n’en voyons ici que trois règles de base, indispensables pour lire correctement.'),
    explain('1. Le madd naturel : une voyelle longue simple (ā, ī, ū) dure deux temps. Certains signes, comme le petit trait ondulé ( ـٓ ), indiquent un allongement plus long ; ils seront détaillés dans un cours de tajwīd.'),
    explain('2. L’article ال devant une lettre solaire : le lām ne se prononce pas et la lettre suivante est doublée (shadda). Devant une lettre lunaire, le lām se prononce avec un sukūn.'),
    ex('الشَّمْس', 'ash-shams', 'le soleil (lettre solaire ش)', 'word:ashshams'), ex('الْقَمَر', 'al-qamar', 'la lune (lettre lunaire ق)', 'word:alqamar'),
    { kind: 'table', caption: 'Les 14 lettres solaires', head: ['Lettres'], arCols: [0], rows: [['ت ث د ذ ر ز س ش ص ض ط ظ ل ن']] },
    explain('3. La hamzat al-waṣl : l’alif de l’article ne se prononce que si l’on commence la lecture par ce mot. Au milieu d’une phrase, il s’efface et on enchaîne avec le mot précédent.'),
    tip('Astuce : les lettres solaires sont celles qui se prononcent avec la pointe de la langue près des dents.'),
  ],
  exercises: [
    read('m3l8-1', 'الشَّمْس', 'ash-shams', [['al-shams', 'ش est une lettre solaire : le lām de l’article ne se prononce pas.'], ['ash-sham', 'Le س final porte un sukūn mais se prononce bien.']], 'ش est solaire : ل s’efface et ش est doublée.', 'word:ashshams'),
    read('m3l8-2', 'الْقَمَر', 'al-qamar', [['aq-qamar', 'ق est une lettre lunaire : le lām se prononce.'], ['al-qamr', 'م porte une fatḥa : « ma ».']], 'ق est lunaire : on prononce « al ».', 'word:alqamar'),
    {
      id: 'm3l8-3', type: 'sort', prompt: 'Lettre solaire ou lunaire ?',
      buckets: [{ id: 'sun', label: 'Solaire' }, { id: 'moon', label: 'Lunaire' }],
      items: [
        { id: 'a', ar: 'ن', bucket: 'sun' }, { id: 'b', ar: 'ر', bucket: 'sun' }, { id: 'c', ar: 'ت', bucket: 'sun' },
        { id: 'd', ar: 'ك', bucket: 'moon' }, { id: 'e', ar: 'ب', bucket: 'moon' }, { id: 'f', ar: 'ع', bucket: 'moon' },
      ],
      explanation: 'Solaires : ت ث د ذ ر ز س ش ص ض ط ظ ل ن. Toutes les autres sont lunaires.',
      reviewKey: 'rule:sun-moon',
    },
    quick('m3l8-4', 'mcq', 'Combien de temps dure un madd naturel ?', { label: 'Deux temps' }, [
      { label: 'Un temps', why: 'Un temps correspond à une voyelle brève.' },
      { label: 'Six temps', why: 'Les allongements plus longs relèvent de règles particulières, signalées par des signes.' },
    ], 'Le madd naturel (voyelle longue simple) dure deux temps.', { reviewKey: 'rule:madd' }),
  ],
  summary: ['Madd naturel : deux temps.', 'Lettre solaire : ل muet + doublement.', 'Hamzat al-waṣl : prononcée seulement en début de lecture.'],
};

const m3All = [m3l1, m3l2, m3l3, m3l4, m3l5, m3l6, m3l7, m3l8];
export const module3: Module = {
  id: 3, title: 'Voyelles et signes', subtitle: 'Fatḥa, kasra, ḍamma, sukūn, shadda, tanwīn, madd', tier: 'free',
  lessons: [...m3All, moduleTest(3, m3All, 'Test du module 3 : voyelles et signes')],
};

// ───────────────────────── Module 4 : apprendre à lire ─────────────────────────

const m4l1: Lesson = {
  id: 'm4l1', moduleId: 4, position: 1, title: 'Lire des syllabes ouvertes', difficulty: 1, estMinutes: 7, kind: 'lesson',
  objective: 'Assembler trois syllabes consonne + voyelle',
  steps: [
    explain('Une syllabe ouverte = une consonne + une voyelle brève. Beaucoup de verbes arabes au passé sont formés de trois syllabes ouvertes : c’est un excellent entraînement.'),
    ex('كَتَبَ', 'ka-ta-ba', 'il a écrit', 'word:kataba'), ex('ذَهَبَ', 'dha-ha-ba', 'il est allé', 'word:dhahaba'), ex('جَلَسَ', 'ja-la-sa', 'il s’est assis', 'word:jalasa'), ex('خَلَقَ', 'kha-la-qa', 'il a créé', 'word:khalaqa'),
    tip('Lisez lettre par lettre de droite à gauche, puis accélérez jusqu’à lire le mot d’un seul souffle.'),
  ],
  exercises: [
    order('m4l1-1', 'كَتَبَ', 'kataba', [['كَ', 'ka'], ['تَ', 'ta'], ['بَ', 'ba']]),
    order('m4l1-2', 'خَلَقَ', 'khalaqa', [['خَ', 'kha'], ['لَ', 'la'], ['قَ', 'qa']]),
    read('m4l1-3', 'ذَهَبَ', 'dhahaba', [['dahaba', 'ذ (point au-dessus) se prononce « dh », comme l’anglais « this ».'], ['dhahiba', 'ه porte une fatḥa : « ha ».']], 'ذَ (dha) + هَ (ha) + بَ (ba).', 'word:dhahaba'),
    read('m4l1-4', 'جَلَسَ', 'jalasa', [['jalisa', 'ل porte une fatḥa (trait au-dessus).'], ['halasa', 'ج a un point dessous : « j ».']], 'جَ (ja) + لَ (la) + سَ (sa).', 'word:jalasa'),
  ],
  summary: ['Syllabe ouverte = consonne + voyelle.', 'كَتَبَ = ka-ta-ba.'],
};

const m4l2: Lesson = {
  id: 'm4l2', moduleId: 4, position: 2, title: 'Lire des syllabes fermées', difficulty: 2, estMinutes: 7, kind: 'lesson',
  objective: 'Lire des mots contenant un sukūn',
  steps: [
    explain('Une syllabe fermée = consonne + voyelle + consonne sans voyelle (sukūn).'),
    ex('عَبْد', 'ʿabd', 'serviteur', 'word:abd'), ex('قَلْب', 'qalb', 'cœur', 'word:qalb'), ex('شَمْس', 'shams', 'soleil', 'word:shams'), ex('هَلْ', 'hal', 'est-ce que ?', 'word:hal'),
  ],
  exercises: [
    read('m4l2-1', 'قَلْب', 'qalb', [['qalab', 'ل porte un sukūn : pas de voyelle après lui.'], ['kalb', 'ق (deux points, tête ronde) n’est pas ك : son plus profond.']], 'قَلْ (qal) + ب = « qalb ».', 'word:qalb'),
    read('m4l2-2', 'عَبْد', 'ʿabd', [['ʿabad', 'ب porte un sukūn.'], ['ʿubd', 'ع porte une fatḥa.']], 'عَبْ (ʿab) + د = « ʿabd ».', 'word:abd'),
    order('m4l2-3', 'شَمْس', 'shams', [['شَمْ', 'sham'], ['س', 's']]),
    read('m4l2-4', 'هَلْ', 'hal', [['ḥal', 'ه (léger) n’est pas ح (serré).'], ['hala', 'ل porte un sukūn.']], 'هَ (ha) + لْ (l) = « hal ».', 'word:hal'),
  ],
  summary: ['Le sukūn ferme la syllabe.', 'قَلْب = qalb.'],
};

const m4l3: Lesson = {
  id: 'm4l3', moduleId: 4, position: 3, title: 'Lire des mots avec voyelles longues', difficulty: 2, estMinutes: 7, kind: 'lesson',
  objective: 'Distinguer voyelles brèves et longues dans un mot',
  steps: [ex('كِتَاب', 'kitāb', 'livre', 'word:kitab'), ex('كَبِير', 'kabīr', 'grand', 'word:kabir'), ex('سَمِيع', 'samīʿ', 'qui entend', 'word:sami'), ex('رَسُول', 'rasūl', 'messager', 'word:rasul')],
  exercises: [
    read('m4l3-1', 'كِتَاب', 'kitāb', [['kitab', 'L’alif après تَ allonge le son : « tā ».'], ['katib', 'ك porte une kasra : « ki ».']], 'كِ (ki) + تَا (tā) + ب.', 'word:kitab'),
    read('m4l3-2', 'رَسُول', 'rasūl', [['rasul', 'Le و après سُ allonge le son.'], ['rusūl', 'ر porte une fatḥa.']], 'رَ (ra) + سُو (sū) + ل.', 'word:rasul'),
    read('m4l3-3', 'كَبِير', 'kabīr', [['kabir', 'Le ي après بِ allonge le son.'], ['kubīr', 'ك porte une fatḥa.']], 'كَ (ka) + بِي (bī) + ر.', 'word:kabir'),
    order('m4l3-4', 'سَمِيع', 'samīʿ', [['سَ', 'sa'], ['مِي', 'mī'], ['ع', 'ʿ']]),
  ],
  summary: ['Repérez ا و ي après une voyelle brève : la voyelle est longue.'],
};

const m4l4: Lesson = {
  id: 'm4l4', moduleId: 4, position: 4, title: 'Lire avec shadda et tanwīn', difficulty: 3, estMinutes: 8, kind: 'lesson',
  objective: 'Combiner tous les signes dans un même mot',
  steps: [ex('رَبٌّ', 'rabbun', 'un seigneur', 'word:rabbun'), ex('عِلْمٌ', 'ʿilmun', 'un savoir', 'word:ilmun'), ex('جَنَّةٌ', 'jannatun', 'un jardin', 'word:jannatun')],
  exercises: [
    read('m4l4-1', 'رَبٌّ', 'rabbun', [['rabun', 'La shadda double le ب.'], ['rabbin', 'Le tanwīn est une double ḍamma : « un ».']], 'رَ (ra) + بٌّ (b-bun).', 'word:rabbun'),
    read('m4l4-2', 'عِلْمٌ', 'ʿilmun', [['ʿalmun', 'ع porte une kasra : « ʿi ».'], ['ʿilm', 'Le tanwīn ajoute « un ».']], 'عِلْ (ʿil) + مٌ (mun).', 'word:ilmun'),
    read('m4l4-3', 'جَنَّةٌ', 'jannatun', [['janatun', 'La shadda double le ن.'], ['jannahun', 'ة suivie d’une voyelle se prononce « t ».']], 'جَنْ (jan) + نَ (na) + ةٌ (tun).', 'word:jannatun'),
  ],
  summary: ['Shadda + tanwīn peuvent se combiner : رَبٌّ = rabbun.'],
};

const m4l5: Lesson = {
  id: 'm4l5', moduleId: 4, position: 5, title: 'Lire l’article الـ', difficulty: 3, estMinutes: 8, kind: 'lesson',
  objective: 'Lire l’article devant les lettres solaires et lunaires',
  steps: [ex('الْكِتَاب', 'al-kitāb', 'le livre', 'word:alkitab'), ex('النُّور', 'an-nūr', 'la lumière', 'word:annur'), ex('الرَّحْمَة', 'ar-raḥma', 'la miséricorde', 'word:arrahma'), ex('الْقَلْب', 'al-qalb', 'le cœur', 'word:alqalb')],
  exercises: [
    read('m4l5-1', 'النُّور', 'an-nūr', [['al-nūr', 'ن est solaire : ل ne se prononce pas.'], ['an-nur', 'Le و allonge le son : « nū ».']], 'ن solaire : « an-nūr ».', 'word:annur'),
    read('m4l5-2', 'الْكِتَاب', 'al-kitāb', [['ak-kitāb', 'ك est lunaire : ل se prononce.'], ['al-kitab', 'L’alif allonge « tā ».']], 'ك lunaire : « al-kitāb ».', 'word:alkitab'),
    read('m4l5-3', 'الرَّحْمَة', 'ar-raḥma', [['al-raḥma', 'ر est solaire.'], ['ar-rahma', 'ح (serré) n’est pas ه (léger).']], 'ر solaire : « ar-raḥma ».', 'word:arrahma'),
  ],
  summary: ['Solaire : الشّ… (ash-), lunaire : الْق… (al-).'],
};

const m4All = [m4l1, m4l2, m4l3, m4l4, m4l5];
export const module4: Module = {
  id: 4, title: 'Apprendre à lire', subtitle: 'Syllabes, mots, article', tier: 'free',
  lessons: [...m4All, moduleTest(4, m4All, 'Test du module 4 : la lecture')],
};

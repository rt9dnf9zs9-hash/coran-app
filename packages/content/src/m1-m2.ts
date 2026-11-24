import { describeDots, formsOf, LETTERS, letter, NON_JOINING } from '../../core/src/index.ts';
import type { Exercise, Lesson, Module, Step } from '../../core/src/index.ts';
import { explain, formExercise, letterToSound, listenLetter, matchNames, moduleTest, nameToLetter, quick, tip } from './helpers.ts';

// ───────────────────────── Module 1 : l'alphabet ─────────────────────────

const GROUPS: { ids: string[]; title: string; intro: string; tipText: string }[] = [
  {
    ids: ['alif', 'ba', 'ta', 'tha'],
    title: 'Alif et la famille de bā’',
    intro: 'L’arabe s’écrit et se lit de droite à gauche. Il compte 28 lettres, toutes des consonnes (alif, wāw et yā’ servent aussi à noter les voyelles longues). Beaucoup de lettres partagent le même tracé et ne se distinguent que par leurs points : c’est le cas de ب, ت et ث.',
    tipText: 'Même tracé, points différents : ب un point dessous, ت deux points dessus, ث trois points dessus. Regardez toujours les points en premier.',
  },
  {
    ids: ['jim', 'hha', 'kha'],
    title: 'La famille de jīm',
    intro: 'ج, ح et خ partagent le même corps. Deux d’entre elles produisent des sons qui n’existent pas en français : ح (souffle serré) et خ (raclement).',
    tipText: 'ج point dessous, ح aucun point, خ point dessus. Pour ح, soufflez fort en serrant le milieu de la gorge, sans racler.',
  },
  {
    ids: ['dal', 'dhal', 'ra', 'zay'],
    title: 'Dāl, dhāl, rā’ et zāy',
    intro: 'Ces quatre lettres ont une particularité importante : elles ne se lient jamais à la lettre qui les suit. Vous le verrez au module 2.',
    tipText: 'د et ذ sont posées sur la ligne ; ر et ز descendent sous la ligne. Le point fait la différence dans chaque paire.',
  },
  {
    ids: ['sin', 'shin', 'sad', 'dad'],
    title: 'Sīn, shīn, ṣād et ḍād',
    intro: 'س et ش ont des « dents » ; ص et ض ont une boucle. ص et ض sont des lettres emphatiques : elles se prononcent avec l’arrière de la langue relevé, ce qui rend le son plus grave.',
    tipText: 'Emphatique = son « plein » et grave. Comparez س (s clair) et ص (s grave) : la différence change le sens des mots.',
  },
  {
    ids: ['tta', 'zza', 'ayn', 'ghayn'],
    title: 'Ṭā’, ẓā’, ʿayn et ghayn',
    intro: 'ط et ظ sont aussi emphatiques. ع et غ partagent le même tracé : ع est un son de gorge sans équivalent en français, غ ressemble au « r » parisien.',
    tipText: 'ع ne se transcrit pas comme une voyelle : c’est une vraie consonne. Écoutez-la souvent et répétez lentement.',
  },
  {
    ids: ['fa', 'qaf', 'kaf', 'lam'],
    title: 'Fā’, qāf, kāf et lām',
    intro: 'ف et ق ont une tête ronde : ف un point, ق deux points. ق se prononce beaucoup plus au fond de la bouche que ك.',
    tipText: 'Distinguez bien ق (k profond, contre la luette) et ك (k français). C’est une des oppositions les plus fréquentes du Coran.',
  },
  {
    ids: ['mim', 'nun', 'ha', 'waw', 'ya'],
    title: 'Mīm, nūn, hā’, wāw et yā’',
    intro: 'Dernier groupe. ه est un « h » léger, à ne pas confondre avec ح (souffle serré). و et ي servent aussi à écrire les voyelles longues « oû » et « î ».',
    tipText: 'ه (léger) ≠ ح (serré). Si vous hésitez, comparez les deux enregistrements côte à côte.',
  },
];

function m1Lesson(g: (typeof GROUPS)[number], i: number): Lesson {
  const ls = g.ids.map(letter);
  const pool = LETTERS;
  const prefix = `m1l${i + 1}`;
  const exercises: Exercise[] = [];
  for (const l of ls) exercises.push(listenLetter(prefix, l, pool), nameToLetter(prefix, l, pool));
  for (const l of ls.slice(0, 2)) exercises.push(letterToSound(prefix, l, pool));
  exercises.push(matchNames(`${prefix}-match`, ls));
  const steps: Step[] = [explain(g.intro), ...ls.map((l) => ({ kind: 'letter' as const, letterId: l.id })), tip(g.tipText)];
  return {
    id: prefix,
    moduleId: 1,
    position: i + 1,
    title: g.title,
    objective: `Reconnaître, nommer et prononcer : ${ls.map((l) => l.ar).join(' ')}`,
    difficulty: i < 2 ? 1 : 2,
    estMinutes: 6,
    kind: 'lesson',
    steps,
    exercises,
    summary: ls.map((l) => `${l.ar} — ${l.name} : « ${l.translit} » (${describeDots(l)})`),
  };
}

const m1Lessons = GROUPS.map(m1Lesson);

// Leçon de synthèse : les lettres qui se ressemblent
const similar: Lesson = {
  id: 'm1l8',
  moduleId: 1,
  position: 8,
  title: 'Les lettres qui se ressemblent',
  objective: 'Distinguer les lettres de même squelette grâce aux points',
  difficulty: 2,
  estMinutes: 7,
  kind: 'lesson',
  steps: [
    explain('Quinze lettres ne se distinguent que par leurs points. Voici les familles à connaître. Repérez d’abord le squelette, puis comptez les points et regardez leur position.'),
    { kind: 'table', caption: 'Familles de lettres', head: ['Squelette', 'Lettres', 'Différence'], arCols: [1], rows: [
      ['ب', 'ب ت ث', '1 point dessous / 2 dessus / 3 dessus'],
      ['ح', 'ج ح خ', 'point dessous / aucun / point dessus'],
      ['د', 'د ذ', 'aucun / point dessus'],
      ['ر', 'ر ز', 'aucun / point dessus'],
      ['س', 'س ش', 'aucun / 3 points dessus'],
      ['ص', 'ص ض', 'aucun / point dessus'],
      ['ط', 'ط ظ', 'aucun / point dessus'],
      ['ع', 'ع غ', 'aucun / point dessus'],
      ['ف', 'ف ق', '1 point / 2 points'],
    ] },
    tip('Les points sont obligatoires en arabe : un point oublié change la lettre, donc le mot.'),
  ],
  exercises: [
    quick('m1l8-1', 'visual', 'Quelle lettre a trois points au-dessus ?', { ar: 'ث' }, [
      { ar: 'ت', why: 'ت a deux points au-dessus.' },
      { ar: 'ب', why: 'ب a un seul point, en dessous.' },
      { ar: 'ن', why: 'ن a un point au-dessus et un corps plus arrondi.' },
    ], 'ث (thā’) porte trois points au-dessus ; ش (shīn) aussi, mais avec un squelette à dents.', { reviewKey: 'letter:tha' }),
    quick('m1l8-2', 'visual', 'Laquelle de ces lettres n’a aucun point ?', { ar: 'ح' }, [
      { ar: 'ج', why: 'ج a un point en dessous (dans le creux).' },
      { ar: 'خ', why: 'خ a un point au-dessus.' },
      { ar: 'غ', why: 'غ a un point au-dessus ; elle appartient à la famille de ع.' },
    ], 'ح (ḥā’) n’a aucun point ; c’est le point qui distingue ج et خ.', { reviewKey: 'letter:hha' }),
    quick('m1l8-3', 'visual', 'Quelle lettre est ḍād ?', { ar: 'ض' }, [
      { ar: 'ص', why: 'ص (ṣād) a le même squelette sans point.' },
      { ar: 'ظ', why: 'ظ (ẓā’) a un point mais un squelette à hampe verticale.' },
      { ar: 'ذ', why: 'ذ (dhāl) est petite et ne descend pas.' },
    ], 'ض = ṣād + un point au-dessus.', { reviewKey: 'letter:dad' }),
    quick('m1l8-4', 'visual', 'Quelle lettre est qāf ?', { ar: 'ق' }, [
      { ar: 'ف', why: 'ف (fā’) n’a qu’un point.' },
      { ar: 'ك', why: 'ك (kāf) a un tracé anguleux, sans point.' },
      { ar: 'و', why: 'و (wāw) a une tête ronde mais aucun point et ne se lie pas.' },
    ], 'ق (qāf) a deux points au-dessus de sa tête ronde.', { reviewKey: 'letter:qaf' }),
    {
      id: 'm1l8-5', type: 'sort', prompt: 'Classez ces lettres selon leurs points',
      buckets: [{ id: 'none', label: 'Aucun point' }, { id: 'above', label: 'Points au-dessus' }, { id: 'below', label: 'Points en dessous' }],
      items: [
        { id: 'i1', ar: 'ح', bucket: 'none' }, { id: 'i2', ar: 'ع', bucket: 'none' },
        { id: 'i3', ar: 'ت', bucket: 'above' }, { id: 'i4', ar: 'ز', bucket: 'above' },
        { id: 'i5', ar: 'ب', bucket: 'below' }, { id: 'i6', ar: 'ي', bucket: 'below' },
      ],
      explanation: 'ح et ع : aucun point. ت et ز : points au-dessus. ب et ي : points en dessous.',
    },
  ],
  summary: ['Squelette d’abord, points ensuite.', 'Neuf familles de lettres jumelles à connaître.'],
};

const m1All = [...m1Lessons, similar];
export const module1: Module = {
  id: 1,
  title: 'L’alphabet arabe',
  subtitle: 'Les 28 lettres, leur nom et leur son',
  tier: 'free',
  lessons: [...m1All, moduleTest(1, m1All, 'Test du module 1 : l’alphabet')],
};

// ───────────────────────── Module 2 : les formes ─────────────────────────

const m2l1: Lesson = {
  id: 'm2l1', moduleId: 2, position: 1, title: 'Une lettre, quatre formes', difficulty: 1, estMinutes: 6, kind: 'lesson',
  objective: 'Comprendre pourquoi une lettre change de forme selon sa position',
  steps: [
    explain('En arabe, les lettres d’un mot sont attachées entre elles, comme en écriture cursive. Selon sa place, une lettre prend une forme isolée, initiale (début de mot), médiane (milieu) ou finale (fin de mot).'),
    { kind: 'forms', letterId: 'ba' },
    explain('La forme initiale est souvent une version raccourcie de la lettre, qui « tend la main » vers la suivante. La forme finale garde la queue de la lettre isolée.'),
    { kind: 'forms', letterId: 'nun' },
    tip('Au début et au milieu d’un mot, ب ت ث ن ي ont presque la même forme : seuls les points les distinguent.'),
  ],
  exercises: [
    formExercise('m2l1', letter('ba'), 'initial'), formExercise('m2l1', letter('ba'), 'final'),
    formExercise('m2l1', letter('ta'), 'medial'), formExercise('m2l1', letter('nun'), 'initial'),
    formExercise('m2l1', letter('ya'), 'medial'),
  ],
  summary: ['Isolée, initiale, médiane, finale.', 'Les points restent à leur place dans toutes les formes.'],
};

const m2l2Ids = ['jim', 'sin', 'fa', 'qaf', 'lam', 'mim'];
const m2l2: Lesson = {
  id: 'm2l2', moduleId: 2, position: 2, title: 'Les formes des lettres courantes', difficulty: 2, estMinutes: 8, kind: 'lesson',
  objective: 'Reconnaître les quatre formes de ج س ف ق ل م',
  steps: [explain('Observez chaque lettre dans ses quatre positions. Repérez ce qui reste identique : c’est ce qui vous permettra de la reconnaître dans un mot.'), ...m2l2Ids.map((id) => ({ kind: 'forms' as const, letterId: id }))],
  exercises: m2l2Ids.flatMap((id, i) => [formExercise('m2l2', letter(id), (['initial', 'medial', 'final'] as const)[i % 3]!)]).concat(
    formExercise('m2l2', letter('lam'), 'final'), formExercise('m2l2', letter('mim'), 'initial'),
  ),
  summary: ['ل en fin de mot garde sa grande boucle.', 'م se reconnaît à sa petite boucle, à toutes les positions.'],
};

const m2l3: Lesson = {
  id: 'm2l3', moduleId: 2, position: 3, title: 'Les six lettres qui ne se lient pas à gauche', difficulty: 2, estMinutes: 7, kind: 'lesson',
  objective: 'Identifier ا د ذ ر ز و et leurs effets sur l’écriture d’un mot',
  steps: [
    explain('Six lettres ne se lient jamais à la lettre suivante : ا د ذ ر ز و. Elles se lient à la lettre précédente, mais créent une coupure après elles. La lettre qui les suit prend donc une forme initiale ou isolée, même au milieu du mot.'),
    ...NON_JOINING.map((l) => ({ kind: 'forms' as const, letterId: l.id })),
    { kind: 'example', ar: 'دَرَسَ', translit: 'darasa', fr: 'il a étudié', audio: 'word:darasa', note: 'د et ر ne se lient pas à gauche : le mot est écrit en trois morceaux.' },
    tip('Moyen mnémotechnique : « a, d, dh, r, z, w » — toutes les autres lettres se lient des deux côtés.'),
  ],
  exercises: [
    {
      id: 'm2l3-sort', type: 'sort', prompt: 'Ces lettres se lient-elles à la lettre suivante ?',
      buckets: [{ id: 'yes', label: 'Se lie' }, { id: 'no', label: 'Ne se lie pas' }],
      items: [
        { id: 'a', ar: 'ا', bucket: 'no' }, { id: 'b', ar: 'ب', bucket: 'yes' }, { id: 'c', ar: 'د', bucket: 'no' },
        { id: 'd', ar: 'م', bucket: 'yes' }, { id: 'e', ar: 'ر', bucket: 'no' }, { id: 'f', ar: 'و', bucket: 'no' },
        { id: 'g', ar: 'ل', bucket: 'yes' }, { id: 'h', ar: 'ز', bucket: 'no' },
      ],
      explanation: 'Ne se lient pas : ا د ذ ر ز و. Toutes les autres se lient à la lettre suivante.',
      reviewKey: 'rule:non-joining',
    },
    quick('m2l3-2', 'mcq', 'Combien de lettres arabes ne se lient jamais à la lettre suivante ?', { label: '6' }, [
      { label: '4', why: 'Il en manque deux : la liste complète est ا د ذ ر ز و.' },
      { label: '8', why: 'Seules six lettres ont cette propriété : ا د ذ ر ز و.' },
      { label: '28', why: 'La grande majorité des lettres se lient des deux côtés.' },
    ], 'Les six lettres sont ا د ذ ر ز و.', { reviewKey: 'rule:non-joining' }),
    formExercise('m2l3', letter('dal'), 'final'), formExercise('m2l3', letter('waw'), 'medial'), formExercise('m2l3', letter('ra'), 'initial'),
    quick('m2l3-3', 'mcq', 'Dans دَرَسَ, pourquoi le mot est-il coupé en morceaux ?', { label: 'Parce que د et ر ne se lient pas à la lettre suivante' }, [
      { label: 'Parce que le mot contient des voyelles', why: 'Les voyelles brèves sont des signes, elles ne coupent pas le mot.' },
      { label: 'Parce que ce sont trois mots différents', why: 'C’est un seul mot : les coupures viennent des lettres non liantes.' },
    ], 'د et ر font partie des six lettres non liantes : la lettre qui suit commence un nouveau « morceau ».', { ar: 'دَرَسَ' }),
  ],
  summary: ['ا د ذ ر ز و ne se lient jamais à gauche.', 'Un mot peut donc être écrit en plusieurs morceaux.'],
};

const m2l4: Lesson = {
  id: 'm2l4', moduleId: 2, position: 4, title: 'Formes particulières', difficulty: 3, estMinutes: 8, kind: 'lesson',
  objective: 'Reconnaître les lettres qui changent beaucoup de forme, ainsi que لا, ة et ى',
  steps: [
    explain('Certaines lettres changent nettement selon leur position : ع et غ, ه, ك. Observez-les attentivement.'),
    { kind: 'forms', letterId: 'ayn' }, { kind: 'forms', letterId: 'ha' }, { kind: 'forms', letterId: 'kaf' },
    { kind: 'example', ar: 'لا', translit: 'lā', fr: 'non', audio: 'word:la', note: 'Lām suivi de alif forme une ligature obligatoire : لا.' },
    { kind: 'example', ar: 'رَحْمَة', translit: 'raḥma', fr: 'miséricorde', audio: 'word:rahma', note: 'ة (tā’ marbūṭa) se trouve uniquement en fin de mot. Elle se prononce « t » quand on enchaîne, « h » ou rien à la pause.' },
    { kind: 'example', ar: 'عَلَى', translit: 'ʿalā', fr: 'sur', audio: 'word:ala', note: 'ى (alif maqṣūra) ressemble à ي sans points ; en fin de mot elle se lit « â ».' },
  ],
  exercises: [
    formExercise('m2l4', letter('ayn'), 'medial'), formExercise('m2l4', letter('ha'), 'initial'), formExercise('m2l4', letter('kaf'), 'final'),
    quick('m2l4-1', 'mcq', 'Que représente لا ?', { label: 'lām + alif (ligature)' }, [
      { label: 'une lettre à part, la 29e', why: 'لا n’est pas une lettre supplémentaire : c’est l’union obligatoire de ل et ا.' },
      { label: 'alif + lām', why: 'L’ordre est inversé : on lit de droite à gauche, ل d’abord, ا ensuite.' },
    ], 'لا est la ligature obligatoire de ل suivi de ا.', { ar: 'لا' }),
    quick('m2l4-2', 'mcq', 'Où trouve-t-on la tā’ marbūṭa ة ?', { label: 'Uniquement en fin de mot' }, [
      { label: 'En début de mot', why: 'ة n’apparaît jamais en début de mot.' },
      { label: 'N’importe où', why: 'ة est réservée à la fin du mot ; ailleurs on écrit ت.' },
    ], 'ة marque souvent le féminin et se place toujours en fin de mot.', { ar: 'رَحْمَة' }),
  ],
  summary: ['ع غ ه ك changent beaucoup de forme.', 'لا = ل + ا ; ة en fin de mot ; ى se lit « â ».'],
};

const m2All = [m2l1, m2l2, m2l3, m2l4];
export const module2: Module = {
  id: 2,
  title: 'Les formes des lettres',
  subtitle: 'Isolée, initiale, médiane, finale',
  tier: 'free',
  lessons: [...m2All, moduleTest(2, m2All, 'Test du module 2 : les formes')],
};

export const _forms = formsOf;

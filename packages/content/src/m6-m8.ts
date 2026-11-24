import type { Exercise, Lesson, Module, QuranRef, Step } from '../../core/src/index.ts';
import { ex, explain, moduleTest, quick, tip } from './helpers.ts';

const table = (caption: string, head: string[], rows: string[][], arCols: number[]): Step => ({ kind: 'table', caption, head, rows, arCols });
const L = (moduleId: number, position: number, title: string, objective: string, difficulty: 1 | 2 | 3, steps: Step[], exercises: Exercise[], summary: string[]): Lesson => ({
  id: `m${moduleId}l${position}`, moduleId, position, title, objective, difficulty, estMinutes: 9, kind: 'lesson', steps, exercises, summary,
});

// ───────────────────────── Module 6 : conjugaison ─────────────────────────

const PAST: [string, string, string, string][] = [
  ['هُوَ', 'il', 'كَتَبَ', 'kataba'], ['هِيَ', 'elle', 'كَتَبَتْ', 'katabat'],
  ['أَنْتَ', 'tu (masc.)', 'كَتَبْتَ', 'katabta'], ['أَنْتِ', 'tu (fém.)', 'كَتَبْتِ', 'katabti'], ['أَنَا', 'je', 'كَتَبْتُ', 'katabtu'],
  ['هُمْ', 'ils', 'كَتَبُوا', 'katabū'], ['هُنَّ', 'elles', 'كَتَبْنَ', 'katabna'], ['أَنْتُمْ', 'vous (masc.)', 'كَتَبْتُمْ', 'katabtum'],
  ['أَنْتُنَّ', 'vous (fém.)', 'كَتَبْتُنَّ', 'katabtunna'], ['نَحْنُ', 'nous', 'كَتَبْنَا', 'katabnā'],
  ['هُمَا', 'eux deux', 'كَتَبَا', 'katabā'], ['هُمَا', 'elles deux', 'كَتَبَتَا', 'katabatā'], ['أَنْتُمَا', 'vous deux', 'كَتَبْتُمَا', 'katabtumā'],
];
const PRESENT: [string, string, string, string][] = [
  ['هُوَ', 'il', 'يَكْتُبُ', 'yaktubu'], ['هِيَ', 'elle', 'تَكْتُبُ', 'taktubu'], ['أَنْتَ', 'tu (masc.)', 'تَكْتُبُ', 'taktubu'],
  ['أَنْتِ', 'tu (fém.)', 'تَكْتُبِينَ', 'taktubīna'], ['أَنَا', 'je', 'أَكْتُبُ', 'aktubu'], ['هُمْ', 'ils', 'يَكْتُبُونَ', 'yaktubūna'],
  ['هُنَّ', 'elles', 'يَكْتُبْنَ', 'yaktubna'], ['أَنْتُمْ', 'vous (masc.)', 'تَكْتُبُونَ', 'taktubūna'], ['أَنْتُنَّ', 'vous (fém.)', 'تَكْتُبْنَ', 'taktubna'],
  ['نَحْنُ', 'nous', 'نَكْتُبُ', 'naktubu'], ['هُمَا', 'eux deux', 'يَكْتُبَانِ', 'yaktubāni'],
];

const m6l1 = L(6, 1, 'Le verbe arabe et sa racine', 'Comprendre racine, schème et forme de base فَعَلَ', 1, [
  explain('En arabe, la plupart des verbes reposent sur une racine de trois consonnes (verbe trilittère). Les grammairiens arabes représentent ces trois consonnes par ف ع ل : on parle du schème فَعَلَ.'),
  explain('La forme de référence d’un verbe n’est pas l’infinitif (qui n’existe pas en arabe), mais la 3e personne du masculin singulier du passé : كَتَبَ « il a écrit ». C’est sous cette forme qu’on cherche un verbe dans un dictionnaire.'),
  table('Racine et schème', ['Racine', 'Verbe (il a…)', 'Sens'], [['ك ت ب', 'كَتَبَ', 'écrire'], ['خ ل ق', 'خَلَقَ', 'créer'], ['ع ل م', 'عَلِمَ', 'savoir'], ['ذ ه ب', 'ذَهَبَ', 'aller']], [0, 1]),
  tip('La voyelle de la 2e consonne au passé varie : كَتَبَ (a), عَلِمَ (i). Elle s’apprend avec chaque verbe.'),
], [
  quick('m6l1-1', 'mcq', 'Quelle est la forme de référence d’un verbe arabe ?', { label: 'Le passé, 3e personne du masculin singulier (« il a… »)' }, [
    { label: 'L’infinitif', why: 'L’arabe n’a pas d’infinitif : on cite le verbe au passé, à la 3e personne du masculin singulier.' },
    { label: 'L’impératif', why: 'L’impératif se forme à partir du présent ; ce n’est pas la forme de dictionnaire.' },
  ], 'On cite le verbe sous la forme « il a fait » : كَتَبَ.', { reviewKey: 'conj:reference' }),
  quick('m6l1-2', 'mcq', 'Quelle est la racine de خَلَقَ ?', { ar: 'خ ل ق' }, [
    { ar: 'خ ل ك', why: 'La dernière lettre est ق (deux points, tête ronde), pas ك.' },
    { ar: 'ح ل ق', why: 'La première lettre porte un point au-dessus : c’est خ, pas ح.' },
  ], 'خَلَقَ : racine خ ل ق, « créer ».', { ar: 'خَلَقَ', reviewKey: 'root:خ ل ق' }),
  quick('m6l1-3', 'mcq', 'Par quelles lettres les grammairiens représentent-ils la racine ?', { ar: 'ف ع ل' }, [
    { ar: 'ك ت ب', why: 'ك ت ب est une racine réelle (écrire), pas le modèle conventionnel.' },
    { ar: 'ق و ل', why: 'ق و ل est la racine de « dire ».' },
  ], 'Le modèle conventionnel est ف ع ل, d’où le schème فَعَلَ.'),
], ['Verbe trilittère = 3 consonnes.', 'Forme de référence : كَتَبَ « il a écrit ».', 'Schème modèle : فَعَلَ.']);

const pastEx = (i: number, [pr, fr, ar, tr]: (typeof PAST)[number], alt: (typeof PAST)[number][]) =>
  quick(`m6-past-${i}`, 'mcq', `Quelle est la forme du passé de كَتَبَ pour ${pr} (${fr}) ?`, { ar, label: tr }, alt.map(([p2, f2, a2, t2]) => ({ ar: a2, label: t2, why: `${a2} correspond à ${p2} (${f2}).` })), `${pr} (${fr}) → ${ar} (${tr}).`, { reviewKey: `conj:past:${tr}` });

const m6l2 = L(6, 2, 'Le passé (accompli) : singulier', 'Conjuguer كَتَبَ au singulier', 2, [
  explain('Le passé (al-māḍī, « l’accompli ») exprime une action terminée. On le forme en ajoutant une terminaison à la base كَتَبْـ / كَتَبَـ. La terminaison indique la personne, le genre et le nombre.'),
  table('Passé singulier de كَتَبَ', ['Pronom', 'Sens', 'Verbe', 'Lecture'], PAST.slice(0, 5).map((r) => [r[0], r[1], r[2], r[3]]), [0, 2]),
  tip('« tu » existe au masculin (كَتَبْتَ) et au féminin (كَتَبْتِ) : seule la voyelle finale change.'),
], PAST.slice(0, 5).map((r, i, arr) => pastEx(i, r, arr.filter((x) => x !== r).slice(0, 2))), ['هُوَ كَتَبَ · هِيَ كَتَبَتْ · أَنْتَ كَتَبْتَ · أَنْتِ كَتَبْتِ · أَنَا كَتَبْتُ']);

const m6l3 = L(6, 3, 'Le passé : pluriel et duel', 'Conjuguer كَتَبَ au pluriel et au duel', 2, [
  explain('L’arabe classique distingue trois nombres : singulier, duel (deux personnes) et pluriel (trois et plus). Il distingue aussi le masculin et le féminin à la 2e et à la 3e personne.'),
  table('Passé pluriel et duel de كَتَبَ', ['Pronom', 'Sens', 'Verbe', 'Lecture'], PAST.slice(5).map((r) => [r[0], r[1], r[2], r[3]]), [0, 2]),
  tip('Le alif final de كَتَبُوا ne se prononce pas : c’est une convention d’écriture.'),
], [
  ...PAST.slice(5, 10).map((r, i, arr) => pastEx(10 + i, r, arr.filter((x) => x !== r).slice(0, 2))),
  quick('m6l3-dual', 'mcq', 'Que désigne le duel ?', { label: 'Deux personnes ou deux choses' }, [
    { label: 'Un pluriel de politesse', why: 'L’arabe n’a pas de « vous » de politesse grammatical ; le duel désigne exactement deux.' },
    { label: 'Trois personnes ou plus', why: 'Trois et plus = pluriel.' },
  ], 'Le duel est un nombre à part entière : exactement deux.'),
], ['Pluriel : كَتَبُوا (ils), كَتَبْنَا (nous).', 'Duel : كَتَبَا (eux deux).']);

const m6l4 = L(6, 4, 'Le présent (inaccompli)', 'Conjuguer يَكْتُبُ', 2, [
  explain('L’inaccompli (al-muḍāriʿ) exprime une action en cours, habituelle ou à venir. Il se forme avec des préfixes (et parfois des suffixes) autour de la racine : يَـ, تَـ, أَ, نَـ.'),
  table('Inaccompli de كَتَبَ', ['Pronom', 'Sens', 'Verbe', 'Lecture'], PRESENT.map((r) => [r[0], r[1], r[2], r[3]]), [0, 2]),
  explain('La voyelle de la 2e consonne au présent varie selon les verbes et s’apprend avec eux : يَكْتُبُ (u), يَجْلِسُ (i), يَذْهَبُ (a).'),
  ex('يَجْلِسُ', 'yajlisu', 'il s’assoit', 'word:yajlisu'), ex('يَذْهَبُ', 'yadhhabu', 'il va', 'word:yadhhabu'),
], [
  quick('m6l4-1', 'mcq', 'Quel préfixe marque « je » à l’inaccompli ?', { ar: 'أَ' }, [{ ar: 'نَـ', why: 'نَـ marque « nous » : نَكْتُبُ.' }, { ar: 'يَـ', why: 'يَـ marque « il » (et « ils ») : يَكْتُبُ.' }], 'أَكْتُبُ = « j’écris ».', { reviewKey: 'conj:present:prefix' }),
  quick('m6l4-2', 'mcq', 'Que signifie نَكْتُبُ ?', { label: 'nous écrivons' }, [{ label: 'il écrit', why: '« il écrit » = يَكْتُبُ (préfixe يَـ).' }, { label: 'nous avons écrit', why: '« nous avons écrit » = كَتَبْنَا (passé).' }], 'Préfixe نَـ = « nous ».', { ar: 'نَكْتُبُ', reviewKey: 'conj:present:naktubu' }),
  quick('m6l4-3', 'mcq', 'تَكْتُبُ peut signifier :', { label: '« elle écrit » ou « tu (masc.) écris »' }, [{ label: 'uniquement « tu écris »', why: 'تَكْتُبُ sert aussi pour « elle » : le contexte tranche.' }, { label: '« ils écrivent »', why: '« ils écrivent » = يَكْتُبُونَ.' }], 'تَكْتُبُ est commun à هِيَ et أَنْتَ.', { ar: 'تَكْتُبُ' }),
  quick('m6l4-4', 'mcq', 'Quelle forme correspond à « ils écrivent » ?', { ar: 'يَكْتُبُونَ' }, [{ ar: 'كَتَبُوا', why: 'كَتَبُوا = « ils ont écrit » (passé).' }, { ar: 'تَكْتُبُونَ', why: 'تَكْتُبُونَ = « vous écrivez ».' }], 'يَـ + كْتُبُ + ونَ = يَكْتُبُونَ.', { reviewKey: 'conj:present:yaktubuna' }),
], ['Inaccompli = préfixes يَـ تَـ أَ نَـ (+ suffixes).', 'يَكْتُبُ = il écrit.']);

const m6l5 = L(6, 5, 'Exprimer le futur', 'Former le futur avec سَـ et سَوْفَ', 2, [
  explain('L’arabe n’a pas de temps futur distinct. On exprime le futur en plaçant سَـ (collé) ou سَوْفَ (séparé) devant l’inaccompli. سَوْفَ indique souvent un futur plus lointain.'),
  ex('سَيَكْتُبُ', 'sayaktubu', 'il écrira', 'word:sayaktubu'), ex('سَوْفَ يَكْتُبُ', 'sawfa yaktubu', 'il écrira (plus tard)', 'word:sawfayaktubu'),
  tip('Sans سَـ ni سَوْفَ, l’inaccompli peut déjà avoir un sens futur selon le contexte.'),
], [
  quick('m6l5-1', 'mcq', 'Que signifie سَيَكْتُبُ ?', { label: 'il écrira' }, [{ label: 'il a écrit', why: '« il a écrit » = كَتَبَ.' }, { label: 'écris !', why: 'L’impératif est اُكْتُبْ.' }], 'سَـ + inaccompli = futur.', { ar: 'سَيَكْتُبُ', reviewKey: 'conj:future' }),
  quick('m6l5-2', 'mcq', 'L’arabe classique possède-t-il un temps futur propre ?', { label: 'Non : on ajoute سَـ ou سَوْفَ à l’inaccompli' }, [{ label: 'Oui, avec ses propres terminaisons', why: 'Il n’existe que deux formes temporelles : accompli et inaccompli.' }], 'Le futur se construit sur l’inaccompli.'),
  quick('m6l5-3', 'mcq', 'Comment dire « nous écrirons » ?', { ar: 'سَنَكْتُبُ' }, [{ ar: 'كَتَبْنَا', why: 'كَتَبْنَا = « nous avons écrit ».' }, { ar: 'سَيَكْتُبُونَ', why: 'سَيَكْتُبُونَ = « ils écriront ».' }], 'سَـ + نَكْتُبُ = سَنَكْتُبُ.'),
], ['Futur = سَـ / سَوْفَ + inaccompli.']);

const m6l6 = L(6, 6, 'L’impératif', 'Former l’impératif de كَتَبَ, جَلَسَ, ذَهَبَ', 3, [
  explain('L’impératif se forme à partir de l’inaccompli de la 2e personne : on retire le préfixe تَـ, on met un sukūn à la fin, et on ajoute une voyelle d’appui (hamzat al-waṣl) au début, car un mot arabe ne commence pas par une consonne sans voyelle.'),
  explain('La voyelle d’appui est « u » si la 2e consonne de l’inaccompli a une ḍamma (تَكْتُبُ → اُكْتُبْ), sinon « i » (تَجْلِسُ → اِجْلِسْ, تَذْهَبُ → اِذْهَبْ).'),
  table('Impératif de كَتَبَ', ['Destinataire', 'Forme', 'Lecture'], [['toi (masc.)', 'اُكْتُبْ', 'uktub'], ['toi (fém.)', 'اُكْتُبِي', 'uktubī'], ['vous (masc.)', 'اُكْتُبُوا', 'uktubū'], ['vous (fém.)', 'اُكْتُبْنَ', 'uktubna'], ['vous deux', 'اُكْتُبَا', 'uktubā']], [1]),
  tip('Dans le Coran, une forme impérative adressée à Dieu exprime une demande ou une invocation, pas un ordre : on parle alors de supplication (duʿāʾ).'),
], [
  quick('m6l6-1', 'mcq', 'Impératif masculin singulier de جَلَسَ / يَجْلِسُ ?', { ar: 'اِجْلِسْ' }, [{ ar: 'اُجْلُسْ', why: 'L’inaccompli est يَجْلِسُ (kasra) : la voyelle d’appui est « i » et la kasra reste.' }, { ar: 'جَلَسَ', why: 'جَلَسَ est le passé.' }], 'تَجْلِسُ → اِجْلِسْ.', { reviewKey: 'conj:imperative' }),
  quick('m6l6-2', 'mcq', 'Pourquoi l’impératif commence-t-il par une voyelle d’appui ?', { label: 'Un mot arabe ne commence pas par une consonne sans voyelle' }, [{ label: 'Pour marquer la politesse', why: 'La voyelle d’appui est une contrainte phonétique, pas une marque de politesse.' }, { label: 'Pour indiquer le féminin', why: 'Le féminin est marqué par la terminaison ـِي.' }], 'كْتُبْ commencerait par deux consonnes sans voyelle : on ajoute اُ.'),
  quick('m6l6-3', 'mcq', 'Comment dire « écrivez ! » à plusieurs hommes ?', { ar: 'اُكْتُبُوا' }, [{ ar: 'اُكْتُبِي', why: 'اُكْتُبِي s’adresse à une femme.' }, { ar: 'كَتَبُوا', why: 'كَتَبُوا = « ils ont écrit ».' }], 'Terminaison ـُوا pour le masculin pluriel.'),
], ['Impératif = inaccompli de la 2e personne − préfixe + sukūn + voyelle d’appui.']);

const m6All = [m6l1, m6l2, m6l3, m6l4, m6l5, m6l6];
export const module6: Module = { id: 6, title: 'Introduction à la conjugaison', subtitle: 'Racine, passé, présent, futur, impératif', tier: 'premium', lessons: [...m6All, moduleTest(6, m6All, 'Test du module 6 : la conjugaison')] };

// ───────────────────────── Module 7 : grammaire ─────────────────────────

const m7l1 = L(7, 1, 'Nom, verbe et particule', 'Classer un mot dans l’une des trois catégories', 1, [
  explain('La grammaire arabe classique répartit tous les mots en trois catégories : le nom (ism), qui inclut aussi les adjectifs et les pronoms ; le verbe (fiʿl) ; la particule (ḥarf), mot qui n’a de sens complet qu’avec d’autres mots (prépositions, conjonctions…).'),
  table('Les trois catégories', ['Catégorie', 'Exemple', 'Sens'], [['nom (ism)', 'كِتَاب', 'livre'], ['verbe (fiʿl)', 'كَتَبَ', 'il a écrit'], ['particule (ḥarf)', 'فِي', 'dans']], [1]),
  tip('Indices d’un nom : il peut recevoir l’article الـ ou le tanwīn.'),
], [
  { id: 'm7l1-sort', type: 'sort', prompt: 'Classez ces mots', buckets: [{ id: 'ism', label: 'Nom' }, { id: 'fil', label: 'Verbe' }, { id: 'harf', label: 'Particule' }], items: [
    { id: 'a', ar: 'قَلْب', label: 'cœur', bucket: 'ism' }, { id: 'b', ar: 'خَلَقَ', label: 'il a créé', bucket: 'fil' }, { id: 'c', ar: 'مِنْ', label: 'de', bucket: 'harf' },
    { id: 'd', ar: 'عَلِيم', label: 'omniscient', bucket: 'ism', why: 'Les adjectifs font partie des noms en grammaire arabe.' }, { id: 'e', ar: 'يَكْتُبُ', label: 'il écrit', bucket: 'fil' }, { id: 'f', ar: 'عَلَى', label: 'sur', bucket: 'harf' },
  ], explanation: 'Noms : قَلْب, عَلِيم. Verbes : خَلَقَ, يَكْتُبُ. Particules : مِنْ, عَلَى.' },
  quick('m7l1-2', 'mcq', 'Dans quelle catégorie l’adjectif est-il classé ?', { label: 'Nom (ism)' }, [{ label: 'Particule (ḥarf)', why: 'Les particules n’ont pas de sens autonome ; un adjectif en a un.' }, { label: 'Verbe (fiʿl)', why: 'Le verbe exprime une action liée à un temps.' }], 'En grammaire arabe, adjectifs et pronoms sont des noms.'),
], ['Trois catégories : ism, fiʿl, ḥarf.']);

const m7l2 = L(7, 2, 'L’article et l’annexion', 'Rendre un nom défini ; construire « le livre de Dieu »', 2, [
  explain('Un nom est indéfini avec le tanwīn (كِتَابٌ, « un livre ») et défini avec l’article الـ (الْكِتَابُ, « le livre »). On n’a jamais les deux à la fois.'),
  explain('L’annexion (iḍāfa) relie deux noms : « le livre de Dieu » se dit كِتَابُ اللَّهِ. Le premier nom ne prend ni article ni tanwīn ; le second est au cas indirect (kasra).'),
  ex('كِتَابُ اللَّهِ', 'kitābu llāhi', 'le livre de Dieu'), ex('يَوْمُ الدِّينِ', 'yawmu d-dīni', 'le jour de la rétribution'),
], [
  quick('m7l2-1', 'mcq', 'Comment dire « le livre » ?', { ar: 'الْكِتَابُ' }, [{ ar: 'كِتَابٌ', why: 'كِتَابٌ (tanwīn) = « un livre ».' }, { ar: 'الْكِتَابٌ', why: 'L’article et le tanwīn ne se combinent jamais.' }], 'Article الـ = défini.', { reviewKey: 'gram:article' }),
  quick('m7l2-2', 'mcq', 'Dans كِتَابُ اللَّهِ, pourquoi كِتَابُ n’a-t-il ni article ni tanwīn ?', { label: 'Il est le premier terme d’une annexion' }, [{ label: 'C’est une erreur d’écriture', why: 'C’est la règle : le premier terme de l’iḍāfa est défini par le second.' }, { label: 'Parce que c’est un verbe', why: 'كِتَاب est un nom.' }], 'Le premier terme de l’iḍāfa ne prend ni الـ ni tanwīn.', { reviewKey: 'gram:idafa' }),
], ['Défini : الـ ; indéfini : tanwīn.', 'Iḍāfa : nom1 (sans article) + nom2 (cas indirect).']);

const m7l3 = L(7, 3, 'La phrase nominale', 'Construire et analyser une phrase sans verbe', 2, [
  explain('La phrase nominale commence par un nom. Elle comporte un sujet (mubtadaʾ), en général défini, et un prédicat (khabar) qui dit quelque chose de lui. Le verbe « être » au présent n’est pas exprimé.'),
  ex('اللَّهُ عَلِيمٌ', 'Allāhu ʿalīmun', 'Dieu est omniscient'), ex('الْبَيْتُ كَبِيرٌ', 'al-baytu kabīrun', 'la maison est grande'),
  tip('Les deux termes sont au cas direct (marfūʿ), marqué ici par la ḍamma.'),
], [
  quick('m7l3-1', 'mcq', 'Dans الْبَيْتُ كَبِيرٌ, quel mot est le mubtadaʾ (sujet) ?', { ar: 'الْبَيْتُ' }, [{ ar: 'كَبِيرٌ', why: 'كَبِيرٌ est le khabar : il dit quelque chose du sujet.' }], 'Le sujet défini vient en tête : الْبَيْتُ.', { reviewKey: 'gram:nominal' }),
  quick('m7l3-2', 'mcq', 'Comment traduire اللَّهُ عَلِيمٌ ?', { label: 'Dieu est omniscient' }, [{ label: 'Le Dieu omniscient', why: 'Pour une simple qualification, l’adjectif serait défini : اللَّهُ الْعَلِيمُ. Ici l’indéfini en fait un prédicat.' }, { label: 'Dieu a su', why: '« il a su » serait le verbe عَلِمَ.' }], 'Sujet défini + prédicat indéfini = phrase complète avec « est » sous-entendu.'),
], ['Phrase nominale = mubtadaʾ + khabar.', '« être » au présent est sous-entendu.']);

const m7l4 = L(7, 4, 'La phrase verbale', 'Identifier verbe, sujet et complément', 2, [
  explain('La phrase verbale commence par un verbe. Ordre habituel : verbe (fiʿl) + sujet (fāʿil, cas direct) + complément d’objet (mafʿūl bihi, cas direct-objet, marqué par la fatḥa).'),
  ex('كَتَبَ الطَّالِبُ الدَّرْسَ', 'kataba ṭ-ṭālibu d-darsa', 'l’étudiant a écrit la leçon'),
  tip('Quand le sujet est un nom placé après le verbe, le verbe reste au singulier, même si le sujet est pluriel.'),
], [
  quick('m7l4-1', 'mcq', 'Dans كَتَبَ الطَّالِبُ الدَّرْسَ, quel est le sujet ?', { ar: 'الطَّالِبُ' }, [{ ar: 'الدَّرْسَ', why: 'الدَّرْسَ porte une fatḥa : c’est le complément d’objet.' }, { ar: 'كَتَبَ', why: 'كَتَبَ est le verbe.' }], 'Le sujet est au cas direct (ḍamma) : الطَّالِبُ.', { reviewKey: 'gram:verbal' }),
  quick('m7l4-2', 'mcq', 'Quelle voyelle finale marque ici le complément d’objet ?', { label: 'la fatḥa' }, [{ label: 'la ḍamma', why: 'La ḍamma marque le cas direct du sujet.' }, { label: 'la kasra', why: 'La kasra marque le cas indirect (après préposition, en iḍāfa).' }], 'Complément d’objet = manṣūb, marqué par la fatḥa.'),
], ['Verbe + sujet (ḍamma) + complément (fatḥa).']);

const m7l5 = L(7, 5, 'Les pronoms', 'Reconnaître pronoms isolés et suffixes', 2, [
  explain('L’arabe a des pronoms isolés (sujets) et des pronoms suffixes attachés à un nom (possessif), à un verbe (complément) ou à une préposition.'),
  table('Pronoms', ['Personne', 'Isolé', 'Suffixe', 'Exemple'], [['il', 'هُوَ', 'ـهُ', 'كِتَابُهُ (son livre)'], ['elle', 'هِيَ', 'ـهَا', 'كِتَابُهَا (son livre à elle)'], ['tu (m.)', 'أَنْتَ', 'ـكَ', 'كِتَابُكَ (ton livre)'], ['je', 'أَنَا', 'ـي', 'كِتَابِي (mon livre)'], ['nous', 'نَحْنُ', 'ـنَا', 'كِتَابُنَا (notre livre)'], ['ils', 'هُمْ', 'ـهُمْ', 'كِتَابُهُمْ (leur livre)']], [1, 2, 3]),
], [
  quick('m7l5-1', 'mcq', 'Que signifie كِتَابُنَا ?', { label: 'notre livre' }, [{ label: 'nous avons écrit', why: '« nous avons écrit » = كَتَبْنَا (verbe).' }, { label: 'leur livre', why: '« leur livre » = كِتَابُهُمْ.' }], 'Suffixe ـنَا = « notre / nous ».', { reviewKey: 'gram:pronouns' }),
  quick('m7l5-2', 'mcq', 'Quel est le pronom isolé « elle » ?', { ar: 'هِيَ' }, [{ ar: 'هُوَ', why: 'هُوَ = « il ».' }, { ar: 'ـهَا', why: 'ـهَا est le suffixe, pas le pronom isolé.' }], 'هِيَ = elle ; suffixe ـهَا.'),
], ['Isolés : هُوَ هِيَ أَنْتَ أَنَا نَحْنُ هُمْ…', 'Suffixes : ـهُ ـهَا ـكَ ـي ـنَا ـهُمْ…']);

const m7l6 = L(7, 6, 'Prépositions et cas', 'Reconnaître les trois cas et l’effet des prépositions', 3, [
  explain('Les noms arabes portent une marque de cas : direct (marfūʿ, ḍamma), direct-objet (manṣūb, fatḥa), indirect (majrūr, kasra). Après une préposition, le nom est toujours majrūr.'),
  table('Prépositions fréquentes', ['Préposition', 'Sens', 'Exemple'], [['فِي', 'dans', 'فِي الْبَيْتِ'], ['مِنْ', 'de', 'مِنَ السَّمَاءِ'], ['إِلَى', 'vers', 'إِلَى اللَّهِ'], ['عَلَى', 'sur', 'عَلَى الْأَرْضِ'], ['بِـ', 'avec, par', 'بِالْقَلَمِ'], ['لِـ', 'à, pour', 'لِلَّهِ']], [0, 2]),
  tip('مِنْ devient مِنَ devant l’article : on ajoute une voyelle pour enchaîner.'),
], [
  quick('m7l6-1', 'mcq', 'Après فِي, le nom est au cas…', { label: 'indirect (majrūr, kasra)' }, [{ label: 'direct (marfūʿ)', why: 'Le cas direct marque le sujet ; une préposition impose le majrūr.' }, { label: 'direct-objet (manṣūb)', why: 'Le manṣūb marque notamment le complément d’objet.' }], 'Préposition + nom majrūr : فِي الْبَيْتِ.', { reviewKey: 'gram:cases' }),
  quick('m7l6-2', 'mcq', 'Que signifie لِلَّهِ ?', { label: 'à Dieu, pour Dieu' }, [{ label: 'vers Dieu', why: '« vers Dieu » = إِلَى اللَّهِ.' }, { label: 'de Dieu', why: '« de » se dit مِنْ.' }], 'لِـ + اللَّه = لِلَّهِ.'),
], ['Trois cas : ḍamma / fatḥa / kasra.', 'Préposition → majrūr.']);

const m7All = [m7l1, m7l2, m7l3, m7l4, m7l5, m7l6];
export const module7: Module = { id: 7, title: 'Grammaire approfondie', subtitle: 'Phrases, pronoms, prépositions, cas', tier: 'premium', lessons: [...m7All, moduleTest(7, m7All, 'Test du module 7 : la grammaire')] };

// ───────────────────────── Module 8 : compréhension ─────────────────────────

const q = (surah: number, ayah: number, wordFrom?: number, wordTo?: number): QuranRef => ({ surah, ayah, wordFrom, wordTo });
const quran = (ref: QuranRef, fr: string): Step => ({ kind: 'quran', ref, fr });

const m8l1 = L(8, 1, 'Méthode d’analyse d’un mot', 'Analyser un mot : racine, catégorie, fonction', 2, [
  explain('Pour analyser un mot du Coran, posez quatre questions : 1) Quelle est sa catégorie (nom, verbe, particule) ? 2) Quelle est sa racine ? 3) Quelle est sa forme (défini, indéfini, temps du verbe…) ? 4) Quelle est sa fonction dans la phrase ?'),
  explain('Les analyses présentées ici suivent l’analyse grammaticale (iʿrāb) la plus répandue. Lorsque les grammairiens divergent, nous le signalons. Une analyse grammaticale n’est pas une interprétation religieuse du verset.'),
  quran(q(1, 2), 'Traduction indicative : « Louange à Dieu, Seigneur des mondes. »'),
  table('Analyse de 1:2', ['Mot', 'Catégorie', 'Racine', 'Fonction'], [
    ['الْحَمْدُ', 'nom défini', 'ح م د', 'sujet (mubtadaʾ), cas direct'],
    ['لِلَّهِ', 'préposition لِـ + nom', '—', 'groupe prépositionnel formant le prédicat (khabar)'],
    ['رَبِّ', 'nom', 'ر ب ب', 'qualificatif (naʿt) ou apposition (badal) de اللَّه selon les grammairiens, cas indirect'],
    ['الْعَالَمِينَ', 'nom pluriel', 'ع ل م', 'complément du nom (muḍāf ilayhi), cas indirect'],
  ], [0]),
], [
  quick('m8l1-1', 'mcq', 'Dans 1:2, quelle est la fonction de الْحَمْدُ ?', { label: 'Sujet de la phrase nominale (mubtadaʾ)' }, [{ label: 'Verbe', why: 'الْحَمْدُ porte l’article : c’est un nom.' }, { label: 'Complément d’objet', why: 'Il porte une ḍamma (cas direct) et ouvre une phrase nominale.' }], 'الْحَمْدُ : nom défini au cas direct, sujet de la phrase nominale.', { quranRef: q(1, 2, 1, 1), reviewKey: 'analysis:1:2' }),
  quick('m8l1-2', 'mcq', 'Quelle est la racine de رَبِّ ?', { ar: 'ر ب ب' }, [{ ar: 'ر ب ي', why: 'La shadda sur ب indique un ب doublé : la racine est ر ب ب.' }, { ar: 'ع ر ب', why: 'Aucun ع dans ce mot.' }], 'رَبّ : racine ر ب ب (la shadda révèle la 2e et la 3e consonne identiques).', { quranRef: q(1, 2, 3, 3) }),
  quick('m8l1-3', 'mcq', 'Pourquoi الْعَالَمِينَ est-il au cas indirect ?', { label: 'Il est le second terme d’une annexion (« Seigneur des mondes »)' }, [{ label: 'Il suit un verbe', why: 'Il n’y a pas de verbe dans ce verset.' }, { label: 'C’est le sujet', why: 'Le sujet est الْحَمْدُ.' }], 'رَبِّ الْعَالَمِينَ est une iḍāfa : le second terme est majrūr.', { quranRef: q(1, 2, 4, 4) }),
], ['4 questions : catégorie, racine, forme, fonction.', 'Analyse ≠ interprétation religieuse.']);

const m8l2 = L(8, 2, 'Analyse de 1:3 et 1:4', 'Reconnaître qualificatifs et annexions', 3, [
  quran(q(1, 3), 'Traduction indicative : « le Tout-Miséricordieux, le Très-Miséricordieux »'),
  quran(q(1, 4), 'Traduction indicative : « Maître du Jour de la rétribution »'),
  table('Analyse', ['Mot', 'Racine', 'Fonction'], [
    ['الرَّحْمَٰنِ', 'ر ح م', 'qualificatif (naʿt) de اللَّه, cas indirect'],
    ['الرَّحِيمِ', 'ر ح م', 'second qualificatif, cas indirect'],
    ['مَالِكِ', 'م ل ك', 'qualificatif, cas indirect ; premier terme d’une annexion'],
    ['يَوْمِ', 'ي و م', 'second terme d’annexion, puis premier terme de la suivante'],
    ['الدِّينِ', 'د ي ن', 'second terme d’annexion, cas indirect'],
  ], [0, 1]),
  explain('Variante de lecture vérifiée : dans la lecture de Ḥafṣ ʿan ʿĀṣim (celle du texte affiché), on lit مَالِكِ (« maître, possesseur ») ; d’autres lectures canoniques lisent مَلِكِ (« roi »).'),
], [
  quick('m8l2-1', 'mcq', 'Pourquoi الرَّحْمَٰنِ et الرَّحِيمِ sont-ils au cas indirect ?', { label: 'Ce sont des qualificatifs qui s’accordent avec اللَّه (cas indirect au verset précédent)' }, [{ label: 'Ils suivent une préposition', why: 'Aucune préposition ne les précède directement ; ils s’accordent avec le nom qualifié.' }, { label: 'Ce sont des verbes', why: 'Ils portent l’article : ce sont des noms.' }], 'Le naʿt s’accorde en cas avec le nom qu’il qualifie.', { quranRef: q(1, 3) }),
  quick('m8l2-2', 'mcq', 'Combien d’annexions successives y a-t-il dans 1:4 ?', { label: 'Deux : مَالِكِ يَوْمِ puis يَوْمِ الدِّينِ' }, [{ label: 'Aucune', why: 'Trois noms enchaînés sans article sauf le dernier : c’est une chaîne d’annexions.' }, { label: 'Une seule', why: 'يَوْمِ est à la fois second terme et premier terme.' }], 'Chaîne d’iḍāfa : مَالِكِ ← يَوْمِ ← الدِّينِ.', { quranRef: q(1, 4) }),
], ['Le naʿt s’accorde avec le nom qualifié.', 'Chaîne d’annexions : seul le dernier terme porte l’article.']);

const m8l3 = L(8, 3, 'Analyse de 1:5', 'Repérer un complément antéposé et l’inaccompli', 3, [
  quran(q(1, 5), 'Traduction indicative : « C’est Toi que nous adorons, et c’est Toi dont nous implorons le secours. »'),
  table('Analyse', ['Mot', 'Catégorie', 'Fonction'], [
    ['إِيَّاكَ', 'pronom isolé (complément)', 'complément d’objet placé avant le verbe'],
    ['نَعْبُدُ', 'verbe inaccompli, « nous », racine ع ب د', 'verbe ; sujet inclus « nous »'],
    ['وَإِيَّاكَ', 'particule de coordination وَ + pronom isolé', 'relie les deux propositions ; second complément placé avant le verbe'],
    ['نَسْتَعِينُ', 'verbe inaccompli, « nous », racine ع و ن (forme dérivée istafʿala)', 'verbe ; sujet inclus « nous »'],
  ], [0]),
  explain('Placer le complément إِيَّاكَ avant le verbe produit, selon les grammairiens, un effet de restriction : « Toi, et nul autre ».'),
], [
  quick('m8l3-1', 'mcq', 'Quel est le temps de نَعْبُدُ ?', { label: 'Inaccompli (présent), 1re personne du pluriel' }, [{ label: 'Passé', why: 'Le préfixe نَـ caractérise l’inaccompli « nous ».' }, { label: 'Impératif', why: 'L’impératif n’a pas de préfixe نَـ.' }], 'نَـ + عْبُدُ : inaccompli de عَبَدَ, « nous adorons ».', { quranRef: q(1, 5, 2, 2), reviewKey: 'analysis:1:5' }),
  quick('m8l3-2', 'mcq', 'Quelle est la racine de نَسْتَعِينُ ?', { ar: 'ع و ن' }, [{ ar: 'س ت ع', why: 'سْتَ fait partie du schème dérivé (istafʿala), pas de la racine.' }, { ar: 'ن س ت', why: 'نَـ est le préfixe de personne.' }], 'Racine ع و ن (aide) ; le schème istafʿala ajoute l’idée de « demander ».', { quranRef: q(1, 5, 4, 4) }),
  quick('m8l3-3', 'mcq', 'Quel effet produit l’antéposition de إِيَّاكَ ?', { label: 'Une restriction : « Toi seul »' }, [{ label: 'Une question', why: 'Il n’y a pas de particule interrogative.' }, { label: 'Un futur', why: 'Le futur se marque par سَـ / سَوْفَ.' }], 'Complément placé en tête = restriction, selon l’analyse grammaticale courante.', { quranRef: q(1, 5, 1, 1) }),
], ['إِيَّاكَ antéposé = restriction.', 'نَعْبُدُ / نَسْتَعِينُ : inaccompli « nous ».']);

const m8l4 = L(8, 4, 'Analyse de 1:6', 'Reconnaître l’impératif de supplication et le double complément', 3, [
  quran(q(1, 6), 'Traduction indicative : « Guide-nous sur le chemin droit. »'),
  table('Analyse', ['Mot', 'Catégorie', 'Fonction'], [
    ['اهْدِنَا', 'verbe à l’impératif (racine ه د ي) + suffixe ـنَا', 'supplication (duʿāʾ) ; ـنَا = premier complément « nous »'],
    ['الصِّرَاطَ', 'nom défini', 'second complément d’objet, cas direct-objet (fatḥa)'],
    ['الْمُسْتَقِيمَ', 'participe actif (racine ق و م, forme istafʿala)', 'qualificatif de الصِّرَاطَ, même cas'],
  ], [0]),
  tip('Adressé à Dieu, l’impératif exprime une demande : les grammairiens parlent de duʿāʾ et non d’ordre.'),
], [
  quick('m8l4-1', 'mcq', 'Que représente le suffixe ـنَا dans اهْدِنَا ?', { label: '« nous » (complément : guide-nous)' }, [{ label: '« notre » (possessif)', why: 'Attaché à un verbe, le suffixe est complément, pas possessif.' }, { label: 'Le sujet « nous »', why: 'Le sujet de l’impératif est « toi » ; ـنَا est le complément.' }], 'اهْدِ + نَا = « guide-nous ».', { quranRef: q(1, 6, 1, 1), reviewKey: 'analysis:1:6' }),
  quick('m8l4-2', 'mcq', 'Pourquoi الْمُسْتَقِيمَ porte-t-il une fatḥa ?', { label: 'Il qualifie الصِّرَاطَ et s’accorde avec lui (cas direct-objet)' }, [{ label: 'C’est un verbe au passé', why: 'Il porte l’article : c’est un nom (participe).' }, { label: 'Il suit une préposition', why: 'Aucune préposition ici ; une préposition imposerait la kasra.' }], 'Le naʿt prend le cas du nom qualifié.', { quranRef: q(1, 6, 3, 3) }),
], ['Impératif adressé à Dieu = supplication.', 'Le qualificatif s’accorde en cas.']);

const m8All = [m8l1, m8l2, m8l3, m8l4];
export const module8: Module = { id: 8, title: 'Compréhension approfondie du Coran', subtitle: 'Analyse de mots et de versets', tier: 'premium', lessons: [...m8All, moduleTest(8, m8All, 'Test du module 8 : l’analyse')] };

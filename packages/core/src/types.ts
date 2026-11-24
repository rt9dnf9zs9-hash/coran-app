// Modèle de contenu pédagogique partagé (web, mobile, admin, seed SQL).

export type Tier = 'free' | 'premium';
export type Difficulty = 1 | 2 | 3;

/** Référence vers le texte coranique importé de Tanzil (table quran_ayat / quran_words).
 *  Le texte n'est JAMAIS recopié dans le contenu : il est lu dans la table de référence. */
export interface QuranRef {
  surah: number;
  ayah: number;
  /** index de mot (1 = premier mot du verset), optionnel */
  wordFrom?: number;
  wordTo?: number;
}

export type Step =
  | { kind: 'explain'; text: string }
  | { kind: 'example'; ar: string; translit?: string; fr?: string; audio?: string; note?: string }
  | { kind: 'letter'; letterId: string }
  | { kind: 'forms'; letterId: string }
  | { kind: 'table'; caption: string; head: string[]; rows: string[][]; arCols?: number[] }
  | { kind: 'quran'; ref: QuranRef; fr: string }
  | { kind: 'tip'; text: string };

export interface Option {
  id: string;
  label?: string;
  ar?: string;
  /** explication affichée si l'utilisateur choisit cette option alors qu'elle est fausse */
  why?: string;
}

interface ExerciseBase {
  id: string;
  prompt: string;
  /** texte arabe affiché sous la consigne */
  ar?: string;
  /** clé audio à jouer avec la consigne */
  audio?: string;
  /** consigne de remplacement si l'enregistrement n'existe pas encore (jamais de son simulé) */
  textFallback?: string;
  quranRef?: QuranRef;
  /** explication générale de la bonne réponse */
  explanation: string;
  /** élément de révision associé (lettre, signe, mot…) */
  reviewKey?: string;
}

export type ChoiceFormat = 'mcq' | 'listen' | 'visual' | 'fill' | 'translate' | 'syllable';

export interface ChoiceExercise extends ExerciseBase {
  type: 'choice';
  format: ChoiceFormat;
  options: Option[];
  answer: string;
}

export interface MatchExercise extends ExerciseBase {
  type: 'match';
  /** paires gauche/droite ; la réponse attendue est l'appariement par index */
  pairs: { left: Option; right: Option }[];
}

export interface SortExercise extends ExerciseBase {
  type: 'sort';
  buckets: { id: string; label: string }[];
  items: (Option & { bucket: string })[];
}

export interface OrderExercise extends ExerciseBase {
  type: 'order';
  /** fragments dans l'ordre correct (lecture guidée : syllabes d'un mot, de droite à gauche) */
  pieces: Option[];
}

export type Exercise = ChoiceExercise | MatchExercise | SortExercise | OrderExercise;

export type Answer =
  | { type: 'choice'; optionId: string }
  | { type: 'match'; pairs: Record<string, string> } // leftId -> rightId
  | { type: 'sort'; placement: Record<string, string> } // itemId -> bucketId
  | { type: 'order'; sequence: string[] };

export interface Feedback {
  correct: boolean;
  /** explication pédagogique, toujours présente */
  explanation: string;
  /** détail de l'erreur (pourquoi la réponse choisie est fausse) */
  mistake?: string;
  expectedLabel?: string;
}

export interface Lesson {
  id: string;
  moduleId: number;
  position: number;
  title: string;
  objective: string;
  difficulty: Difficulty;
  estMinutes: number;
  kind: 'lesson' | 'module_test' | 'final_exam';
  steps: Step[];
  exercises: Exercise[];
  summary: string[];
}

export interface Module {
  id: number;
  title: string;
  subtitle: string;
  tier: Tier;
  lessons: Lesson[];
}

export interface Letter {
  id: string;
  ar: string;
  name: string; // nom français translittéré
  nameAr: string;
  translit: string;
  /** description du son pour un francophone */
  sound: string;
  /** se lie à la lettre suivante ? */
  joins: boolean;
  dots: 0 | 1 | 2 | 3;
  dotsPos: 'none' | 'above' | 'below' | 'inside';
  /** famille de formes similaires (même squelette) */
  family: string;
  sun: boolean;
}

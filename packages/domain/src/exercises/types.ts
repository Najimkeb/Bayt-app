/**
 * Types des exercices d'une leçon BAYT.
 *
 * Un exercice est une manière de *réviser* un `LearningItem` : sa réponse se
 * traduit en note FSRS et passe par la boucle de révision existante. Il n'y a
 * donc **aucun système de progression parallèle** — le moteur FSRS reste
 * l'unique source de vérité de la mémoire.
 *
 * Trois types, tous à correction **déterministe** (sans IA).
 */

/** Les types d'exercices disponibles. */
export const EXERCISE_TYPES = ['mcq', 'fill_blank', 'matching'] as const;

export type ExerciseType = (typeof EXERCISE_TYPES)[number];

/** Champs communs à tout exercice. */
export interface ExerciseBase {
  readonly id: string;
  /** Item de mémoire révisé par cet exercice (lien vers FSRS). */
  readonly itemId: string;
  /** Énoncé présenté à l'apprenant. */
  readonly prompt: string;
}

/** QCM : une question, plusieurs options, une seule bonne réponse. */
export interface McqExercise extends ExerciseBase {
  readonly type: 'mcq';
  readonly options: readonly string[];
  /** Index de la bonne option (jamais exposé au client). */
  readonly answerIndex: number;
}

/** Texte à trous : saisie libre, tolérante aux accents / casse / espaces. */
export interface FillBlankExercise extends ExerciseBase {
  readonly type: 'fill_blank';
  /** Réponse canonique attendue. */
  readonly answer: string;
  /** Réponses alternatives également acceptées. */
  readonly accept?: readonly string[];
}

/** Une paire à associer (terme ↔ définition). */
export interface MatchingPair {
  readonly left: string;
  readonly right: string;
}

/** Association : apparier des paires. */
export interface MatchingExercise extends ExerciseBase {
  readonly type: 'matching';
  readonly pairs: readonly MatchingPair[];
}

export type Exercise = McqExercise | FillBlankExercise | MatchingExercise;

/** Une leçon : une séquence ordonnée d'exercices. */
export interface Lesson {
  readonly id: string;
  readonly title: string;
  readonly exercises: readonly Exercise[];
}

// --- Réponses de l'apprenant ---------------------------------------------

export interface McqAnswer {
  readonly kind: 'mcq';
  /** Index de l'option choisie. */
  readonly choice: number;
}

export interface FillBlankAnswer {
  readonly kind: 'fill_blank';
  readonly text: string;
}

/**
 * Une association proposée : quel `leftId` va avec quel `rightId`.
 *
 * Les identifiants (`L0`, `R0`, …) sont ceux exposés par `matchingLefts` /
 * `matchingRights` — ils encodent la position d'origine, ce qui permet une
 * validation déterministe côté domaine sans divulguer la solution.
 */
export interface MatchingAnswer {
  readonly kind: 'matching';
  readonly pairs: readonly { readonly leftId: string; readonly rightId: string }[];
}

export type ExerciseAnswer = McqAnswer | FillBlankAnswer | MatchingAnswer;

/** Un côté d'une association, tel que présenté (id stable + texte). */
export interface MatchingSide {
  readonly id: string;
  readonly text: string;
}

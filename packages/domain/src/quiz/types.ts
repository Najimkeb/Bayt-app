/**
 * Contexte « Quiz » — un test ludique et rapide construit à partir des cartes
 * EXISTANTES d'un domaine (aucune génération IA). **Read-only vis-à-vis de
 * FSRS** : le quiz ne modifie jamais la planification mémoire (voir la note
 * d'architecture dans `build.ts`).
 */

/** Type de question d'un quiz. */
export type QuizType = 'mcq' | 'true_false' | 'fill_blank';

/** Carte source d'un quiz (projection minimale d'un `learning_item`). */
export interface QuizSourceItem {
  readonly id: string;
  readonly front: string;
  readonly back: string;
}

/** Question à choix multiple : un énoncé, des options, la bonne réponse. */
export interface McqQuestion {
  readonly id: string;
  readonly itemId: string;
  readonly kind: 'mcq';
  readonly prompt: string;
  readonly options: readonly string[];
  readonly answerIndex: number;
  /** Réponse correcte lisible (pour l'écran de correction). */
  readonly correctAnswer: string;
}

/** Question vrai/faux : un énoncé associe un recto à une réponse (vraie ou non). */
export interface TrueFalseQuestion {
  readonly id: string;
  readonly itemId: string;
  readonly kind: 'true_false';
  readonly prompt: string;
  /** Réponse proposée (parfois fausse). */
  readonly statement: string;
  readonly isTrue: boolean;
  readonly correctAnswer: string;
}

/** Question à saisie : on tape la réponse. */
export interface FillBlankQuestion {
  readonly id: string;
  readonly itemId: string;
  readonly kind: 'fill_blank';
  readonly prompt: string;
  readonly answer: string;
  readonly correctAnswer: string;
}

export type QuizQuestion = McqQuestion | TrueFalseQuestion | FillBlankQuestion;

/** Options de construction d'un quiz. */
export interface BuildQuizOptions {
  /** Nombre de questions visé (borné par le nombre de cartes disponibles). */
  readonly count: number;
  /** Types autorisés (au moins un). Défaut : les trois. */
  readonly types: readonly QuizType[];
}

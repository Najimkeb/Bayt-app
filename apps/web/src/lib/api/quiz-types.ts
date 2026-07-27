/**
 * Contrat HTTP du **quiz**, vu du navigateur (miroir de `@bayt/domain` quiz).
 *
 * Le quiz est **read-only vis-à-vis de FSRS** : ces questions viennent des cartes
 * existantes, la correction se fait côté client (aucun enjeu mémoire), et rien
 * n'est réécrit dans la planification.
 */

export type QuizType = 'mcq' | 'true_false' | 'fill_blank';

export interface McqQuestion {
  readonly id: string;
  readonly itemId: string;
  readonly kind: 'mcq';
  readonly prompt: string;
  readonly options: readonly string[];
  readonly answerIndex: number;
  readonly correctAnswer: string;
}

export interface TrueFalseQuestion {
  readonly id: string;
  readonly itemId: string;
  readonly kind: 'true_false';
  readonly prompt: string;
  readonly statement: string;
  readonly isTrue: boolean;
  readonly correctAnswer: string;
}

export interface FillBlankQuestion {
  readonly id: string;
  readonly itemId: string;
  readonly kind: 'fill_blank';
  readonly prompt: string;
  readonly answer: string;
  readonly correctAnswer: string;
}

export type QuizQuestion = McqQuestion | TrueFalseQuestion | FillBlankQuestion;

export interface QuizResponse {
  readonly questions: readonly QuizQuestion[];
}

/** Une réponse donnée pendant le quiz (pour le score et l'écran de correction). */
export interface QuizOutcome {
  readonly question: QuizQuestion;
  readonly correct: boolean;
}

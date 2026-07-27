/**
 * Contexte « Quiz » — test ludique construit sur les cartes existantes, sans IA
 * et **sans écriture FSRS** (read-only sur la mémoire). Pur et testable.
 */

export { buildQuiz } from './build.js';
export type {
  BuildQuizOptions,
  FillBlankQuestion,
  McqQuestion,
  QuizQuestion,
  QuizSourceItem,
  QuizType,
  TrueFalseQuestion,
} from './types.js';

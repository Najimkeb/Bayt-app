/**
 * Contexte « Leçon » — des exercices variés au-dessus de la boucle FSRS.
 *
 * Le domaine possède les types d'exercices, leur correction déterministe et la
 * traduction résultat → note FSRS. La séquence (ordre, remise en file d'un
 * exercice raté) est orchestrée par l'UI, comme la révision.
 */

export { gradeForOutcome, type ExerciseOutcome } from './grade.js';
export {
  checkAnswer,
  matchingLefts,
  matchingRights,
  normalizeText,
  type ExerciseCheck,
} from './validation.js';
export {
  EXERCISE_TYPES,
  type Exercise,
  type ExerciseAnswer,
  type ExerciseBase,
  type ExerciseType,
  type FillBlankAnswer,
  type FillBlankExercise,
  type Lesson,
  type MatchingAnswer,
  type MatchingExercise,
  type MatchingPair,
  type MatchingSide,
  type McqAnswer,
  type McqExercise,
} from './types.js';

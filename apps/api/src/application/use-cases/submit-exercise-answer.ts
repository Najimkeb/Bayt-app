import {
  checkAnswer,
  gradeForOutcome,
  type Exercise,
  type ExerciseAnswer,
  type ReviewGrade,
} from '@bayt/domain';

import { ExerciseNotFoundError } from '../errors.js';
import type { LessonRepository } from '../ports/lesson-repository.js';
import type { SubmitReview, SubmitReviewResult } from './submit-review.js';

/** Résultat d'une réponse à un exercice. */
export interface ExerciseAnswerResult {
  readonly correct: boolean;
  /** Note FSRS produite par cette réponse. */
  readonly grade: ReviewGrade;
  /** Exercice concerné (pour construire la correction affichée). */
  readonly exercise: Exercise;
  /** Révision enregistrée dans le moteur FSRS. */
  readonly review: SubmitReviewResult;
}

/**
 * Cas d'usage « je réponds à un exercice ».
 *
 * Le cœur de la décision d'architecture : une réponse d'exercice **est** une
 * révision. La correction est déterministe (domaine), la note en découle, et
 * elle passe par la boucle FSRS existante (`SubmitReview`). Aucun système de
 * progression parallèle.
 */
export class SubmitExerciseAnswer {
  public constructor(
    private readonly lessons: LessonRepository,
    private readonly submitReview: SubmitReview,
  ) {}

  public async execute(input: {
    userId: string;
    lessonId: string;
    exerciseId: string;
    answer: ExerciseAnswer;
    /** Un essai raté précédent ou un indice a précédé cette réponse. */
    assisted: boolean;
    now: Date;
  }): Promise<ExerciseAnswerResult> {
    const exercise = await this.lessons.findExercise(input.lessonId, input.exerciseId);

    if (exercise === null) {
      throw new ExerciseNotFoundError(input.exerciseId);
    }

    const { correct } = checkAnswer(exercise, input.answer);
    const grade = gradeForOutcome({ correct, assisted: input.assisted });

    // Chaque réponse se traduit en note FSRS via la boucle de révision.
    const review = await this.submitReview.execute(input.userId, exercise.itemId, grade, input.now);

    return { correct, grade, exercise, review };
  }
}

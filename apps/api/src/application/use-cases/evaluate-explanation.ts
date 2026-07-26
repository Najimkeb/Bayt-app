import { gradeForComprehension, type ReviewGrade } from '@bayt/domain';

import { ItemNotFoundError } from '../errors.js';
import type { ExplanationRepository } from '../ports/explanation-repository.js';
import type { ExplanationEvaluator } from '../../tutoring/explanation-evaluator.js';
import type { Evaluation } from '../../tutoring/evaluation-schema.js';
import type { SubmitReview, SubmitReviewResult } from './submit-review.js';

/** Entrée d'une évaluation d'explication. */
export interface EvaluateExplanationInput {
  readonly userId: string;
  readonly topic: string;
  /** Carte reliée (note FSRS appliquée) ou `null` (sujet libre). */
  readonly itemId: string | null;
  readonly explanation: string;
}

/** Résultat : l'évaluation de BAYT + la note et la replanification FSRS éventuelles. */
export interface EvaluateExplanationResult {
  readonly evaluation: Evaluation;
  readonly grade: ReviewGrade;
  /** Replanification FSRS si reliée à une carte existante (`null` sinon). */
  readonly review: SubmitReviewResult | null;
}

/**
 * Cas d'usage « Explique à BAYT ».
 *
 * BAYT évalue l'explication, la note se traduit en note FSRS (via le domaine) et,
 * si un concept est relié à une carte existante, **passe par la révision
 * existante** — aucun système parallèle. On journalise l'explication pour suivre
 * la progression.
 */
export class EvaluateExplanation {
  public constructor(
    private readonly evaluator: ExplanationEvaluator,
    private readonly explanations: ExplanationRepository,
    private readonly submitReview: SubmitReview,
    private readonly clock: () => Date = () => new Date(),
    private readonly newId: () => string = () => crypto.randomUUID(),
  ) {}

  public async execute(input: EvaluateExplanationInput): Promise<EvaluateExplanationResult> {
    const evaluation = await this.evaluator.evaluate(input.topic, input.explanation);
    const grade = gradeForComprehension(evaluation.verdict, evaluation.score);

    const now = this.clock();
    let review: SubmitReviewResult | null = null;

    if (input.itemId !== null) {
      try {
        // Expliquer, c'est réviser : la note alimente FSRS via la révision existante.
        review = await this.submitReview.execute(input.userId, input.itemId, grade, now);
      } catch (error) {
        // Carte introuvable (id obsolète) → on garde l'évaluation sans FSRS.
        if (!(error instanceof ItemNotFoundError)) {
          throw error;
        }
      }
    }

    await this.explanations.save({
      id: this.newId(),
      userId: input.userId,
      itemId: input.itemId,
      topic: input.topic,
      score: evaluation.score,
      verdict: evaluation.verdict,
      grade: review !== null ? grade : null,
      createdAt: now.getTime(),
    });

    return { evaluation, grade, review };
  }
}

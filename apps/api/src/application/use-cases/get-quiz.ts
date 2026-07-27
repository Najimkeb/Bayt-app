import { buildQuiz, type QuizQuestion, type QuizType } from '@bayt/domain';

import type { ReviewRepository } from '../ports/review-repository.js';

/** Entrée de génération d'un quiz. */
export interface GetQuizInput {
  /** Domaine ciblé, ou tous domaines confondus si absent. */
  readonly domainId?: string | undefined;
  readonly count: number;
  readonly types: readonly QuizType[];
}

/**
 * Cas d'usage « générer un quiz » — à partir des cartes EXISTANTES d'un domaine.
 *
 * **Aucune IA, aucune écriture FSRS** : on lit un échantillon de cartes et le
 * domaine (`buildQuiz`, pur) en fait des questions. Le hasard est injecté pour
 * rester testable ; en production c'est `Math.random`.
 */
export class GetQuiz {
  public constructor(
    private readonly review: ReviewRepository,
    private readonly rng: () => number = () => Math.random(),
  ) {}

  public async execute(input: GetQuizInput): Promise<QuizQuestion[]> {
    // Pool plus large que le nombre de questions : de la matière pour les
    // distracteurs, borné pour rester léger.
    const poolLimit = Math.min(200, Math.max(input.count * 4, input.count + 12));
    const items = await this.review.itemsForQuiz(input.domainId, poolLimit);

    return buildQuiz(items, { count: input.count, types: input.types }, this.rng);
  }
}

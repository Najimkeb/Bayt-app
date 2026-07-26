import type { ReviewGrade, Scheduler } from '@bayt/domain';

import type { ReviewRepository } from '../ports/review-repository.js';

/** Une révision faite hors-ligne, à rejouer. */
export interface OfflineReview {
  /** Id **généré par le client** — clé d'idempotence. */
  readonly clientId: string;
  readonly itemId: string;
  readonly grade: ReviewGrade;
  /** Instant RÉEL de la révision (hors-ligne), pour un rejeu chronologique. */
  readonly reviewedAt: Date;
}

/** Issue du rejeu, par id client — le client purge ce qui est confirmé. */
export interface ReplayResult {
  /** Ids clients durablement pris en compte (appliqués, déjà vus, ou item disparu). */
  readonly settledClientIds: readonly string[];
}

/**
 * Cas d'usage « rejouer la file de révisions faites hors-ligne ».
 *
 * **Priorité absolue : ne jamais perdre ni corrompre une révision FSRS.**
 *
 * - **Idempotence** : un `clientId` déjà appliqué est ignoré (renvois répétés de
 *   la file sans risque de doublon).
 * - **Ordre chronologique** : on rejoue par `reviewedAt` croissant.
 * - **Résolution de conflit (multi-appareils), déterministe** : chaque log est
 *   toujours **journalisé** (append-only, jamais perdu) ; mais l'état FSRS n'est
 *   avancé QUE si la révision est au moins aussi récente que l'état courant
 *   (`reviewedAt >= lastReviewedAt`). Une révision hors-ligne plus ancienne
 *   qu'un état déjà mis à jour par un autre appareil est conservée en historique
 *   sans régresser l'état — **le dernier état FSRS cohérent (le plus récent)
 *   l'emporte**. Jamais d'écrasement aveugle.
 */
export class ReplayReviews {
  public constructor(
    private readonly repository: ReviewRepository,
    private readonly scheduler: Scheduler,
  ) {}

  public async execute(userId: string, reviews: readonly OfflineReview[]): Promise<ReplayResult> {
    if (reviews.length === 0) {
      return { settledClientIds: [] };
    }

    // Rejeu chronologique (défensif : le client trie déjà).
    const ordered = [...reviews].sort((a, b) => a.reviewedAt.getTime() - b.reviewedAt.getTime());

    const already = await this.repository.findAppliedClientIds(
      userId,
      ordered.map((r) => r.clientId),
    );

    const settled: string[] = [];

    for (const review of ordered) {
      // Déjà encaissé : idempotent, on confirme au client sans rien refaire.
      if (already.has(review.clientId)) {
        settled.push(review.clientId);
        continue;
      }

      const card = await this.repository.findCard(userId, review.itemId);
      // Item disparu (supprimé entre-temps) : rien à appliquer, mais on confirme
      // pour que le client purge sa file (le log n'a plus de cible).
      if (card === null) {
        settled.push(review.clientId);
        continue;
      }

      const before = card.state ?? this.scheduler.newState(review.reviewedAt);
      const { state, log } = this.scheduler.review(before, review.grade, review.reviewedAt);

      // N'avance l'état que si cette révision est au moins aussi récente que la
      // dernière connue — sinon on journalise sans régresser (conflit résolu).
      const advanceState =
        before.lastReviewedAt === null ||
        review.reviewedAt.getTime() >= before.lastReviewedAt.getTime();

      await this.repository.commitReview({
        userId,
        itemId: review.itemId,
        state,
        log,
        clientId: review.clientId,
        advanceState,
      });

      settled.push(review.clientId);
    }

    return { settledClientIds: settled };
  }
}

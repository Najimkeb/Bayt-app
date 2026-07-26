import { Scheduler, type SchedulingState } from '@bayt/domain';

import type { DueCard, Preview, ReviewGrade, ReviewResult, SchedulingStateDto } from '@/lib/api/types';

import type { PendingReview } from './db';

/**
 * Révision **côté client, hors-ligne** : le moteur FSRS pur de `packages/domain`
 * tourne dans le navigateur. Le même calcul que le serveur → l'état affiché
 * hors-ligne est cohérent, et le serveur rejouera le log au retour en ligne.
 *
 * La configuration du `Scheduler` est celle par défaut (rétention 90 %), la même
 * que côté serveur (`new Scheduler()` sans surcharge).
 */
const scheduler = new Scheduler();

/** DTO plat → état de planification du domaine (imbriqué). */
function toState(dto: SchedulingStateDto): SchedulingState {
  return {
    memory: { stability: dto.stability, difficulty: dto.difficulty },
    state: dto.state,
    due: new Date(dto.due),
    lastReviewedAt: dto.lastReviewedAt === null ? null : new Date(dto.lastReviewedAt),
    reps: dto.reps,
    lapses: dto.lapses,
    learningStep: dto.learningStep,
  };
}

/** État du domaine → DTO plat (pour l'affichage). */
function toDto(state: SchedulingState): SchedulingStateDto {
  return {
    state: state.state,
    stability: state.memory.stability,
    difficulty: state.memory.difficulty,
    due: state.due.toISOString(),
    lastReviewedAt: state.lastReviewedAt === null ? null : state.lastReviewedAt.toISOString(),
    reps: state.reps,
    lapses: state.lapses,
    learningStep: state.learningStep,
  };
}

/**
 * Note une carte hors-ligne : calcule le nouvel état localement, et prépare
 * l'entrée à mettre en file (id client unique = idempotence).
 */
export function localReview(
  card: DueCard,
  grade: ReviewGrade,
  now: Date,
): { result: ReviewResult; entry: PendingReview } {
  const before = toState(card.scheduling);
  const { state } = scheduler.review(before, grade, now);

  const result: ReviewResult = {
    item: card.item,
    scheduling: toDto(state),
    review: {
      grade,
      reviewedAt: now.toISOString(),
      intervalMs: state.due.getTime() - now.getTime(),
    },
  };

  const entry: PendingReview = {
    clientId: crypto.randomUUID(),
    itemId: card.item.id,
    grade,
    reviewedAt: now.toISOString(),
  };

  return { result, entry };
}

/** Projette les 4 issues d'une carte hors-ligne (intervalles sous les boutons). */
export function localPreview(card: DueCard, now: Date): Preview {
  const before = toState(card.scheduling);

  return {
    itemId: card.item.id,
    now: now.toISOString(),
    outcomes: scheduler.preview(before, now).map((outcome) => ({
      grade: outcome.grade,
      intervalMs: outcome.intervalMs,
      due: outcome.state.due.toISOString(),
    })),
  };
}

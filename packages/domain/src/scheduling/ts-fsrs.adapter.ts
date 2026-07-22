/**
 * Frontiere anti-corruption entre le domaine BAYT et `ts-fsrs`.
 *
 * **Regle** : c'est le seul fichier du domaine autorise a connaitre les types de
 * `ts-fsrs`. Rien de ce qu'il importe ne doit apparaitre dans une signature
 * publique — si un jour le moteur change (implementation maison, portage Rust,
 * version majeure de FSRS), seul ce fichier bouge.
 */

import { createEmptyCard, fsrs, Rating, State, type Card, type Grade } from 'ts-fsrs';

import type { SchedulingEngine } from './engine.js';
import type {
  LearningState,
  ResolvedSchedulerConfig,
  ReviewGrade,
  SchedulingState,
} from './types.js';

/** Note du domaine -> note ts-fsrs. */
const RATING_BY_GRADE: Readonly<Record<ReviewGrade, Grade>> = {
  Again: Rating.Again,
  Hard: Rating.Hard,
  Good: Rating.Good,
  Easy: Rating.Easy,
};

/** Etat du domaine -> etat ts-fsrs. */
const FSRS_STATE_BY_LEARNING_STATE: Readonly<Record<LearningState, State>> = {
  new: State.New,
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
};

/** Etat ts-fsrs -> etat du domaine. */
const LEARNING_STATE_BY_FSRS_STATE: Readonly<Record<State, LearningState>> = {
  [State.New]: 'new',
  [State.Learning]: 'learning',
  [State.Review]: 'review',
  [State.Relearning]: 'relearning',
};

/**
 * Construit le moteur FSRS-6 correspondant a une configuration BAYT.
 *
 * C'est le seul point d'entree de l'adaptateur : tout le reste du domaine ne
 * manipule que le port `SchedulingEngine`.
 */
export function createFsrsEngine(config: ResolvedSchedulerConfig): SchedulingEngine {
  const engine = fsrs({
    request_retention: config.requestRetention,
    maximum_interval: config.maximumInterval,
    enable_fuzz: config.enableFuzz,
  });

  return {
    emptyState: (now) => fromFsrsCard(createEmptyCard(now)),

    next: (state, grade, now) =>
      fromFsrsCard(engine.next(toFsrsCard(state), now, RATING_BY_GRADE[grade]).card),

    retrievability: (state, now) => engine.get_retrievability(toFsrsCard(state), now, false),
  };
}

/**
 * Etat du domaine -> carte ts-fsrs.
 *
 * `elapsed_days` et `scheduled_days` sont des sorties recalculees par le moteur
 * a partir de `last_review` : les valeurs fournies ici ne sont jamais lues.
 */
function toFsrsCard(state: SchedulingState): Card {
  return {
    due: state.due,
    stability: state.memory.stability,
    difficulty: state.memory.difficulty,
    elapsed_days: 0,
    scheduled_days: 0,
    learning_steps: state.learningStep,
    reps: state.reps,
    lapses: state.lapses,
    state: FSRS_STATE_BY_LEARNING_STATE[state.state],
    ...(state.lastReviewedAt === null ? {} : { last_review: state.lastReviewedAt }),
  };
}

/** Carte ts-fsrs -> etat du domaine. */
function fromFsrsCard(card: Card): SchedulingState {
  return {
    memory: {
      stability: card.stability,
      difficulty: card.difficulty,
    },
    state: LEARNING_STATE_BY_FSRS_STATE[card.state],
    due: card.due,
    lastReviewedAt: card.last_review ?? null,
    reps: card.reps,
    lapses: card.lapses,
    learningStep: card.learning_steps,
  };
}

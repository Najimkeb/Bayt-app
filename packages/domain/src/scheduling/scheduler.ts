import type { SchedulingEngine } from './engine.js';
import { SchedulerConfigError } from './errors.js';
import { createFsrsEngine } from './ts-fsrs.adapter.js';
import type {
  ResolvedSchedulerConfig,
  ReviewGrade,
  ReviewResult,
  ScheduledOutcome,
  SchedulerConfig,
  SchedulingPreview,
  SchedulingState,
} from './types.js';

/** Valeurs par defaut du domaine BAYT. */
const DEFAULT_CONFIG: ResolvedSchedulerConfig = {
  /** Compromis effort / oubli retenu pour BAYT (cf. docs/bayt-fondations.md §6). */
  requestRetention: 0.9,
  /** 100 ans : en pratique, pas de plafond. */
  maximumInterval: 36500,
  /** Desactive : le domaine doit rester deterministe. */
  enableFuzz: false,
};

/**
 * Moteur de planification de BAYT — le cœur de la promesse « memorisation
 * long terme ».
 *
 * Calcule *quand* revoir un item pour maintenir une probabilite de rappel
 * ciblee, a partir de l'algorithme **FSRS-6**. Le calcul lui-meme est delegue a
 * `ts-fsrs` (implementation de reference, maintenue et validee) mais reste
 * entierement encapsule : cette classe n'expose que des types BAYT.
 *
 * Sans dependance a l'horloge, au reseau ou a la persistance : `now` est
 * toujours un parametre explicite, ce qui rend le moteur pur et testable.
 *
 * @example
 * ```ts
 * const scheduler = new Scheduler({ requestRetention: 0.9 });
 * const fresh = scheduler.newState(now);
 * const { state, log } = scheduler.review(fresh, 'Good', now);
 * ```
 */
export class Scheduler {
  /** Configuration effective, defauts appliques. */
  public readonly config: ResolvedSchedulerConfig;

  /** Moteur de calcul encapsule — jamais expose. */
  readonly #engine: SchedulingEngine;

  public constructor(config: SchedulerConfig = {}) {
    this.config = resolveConfig(config);
    this.#engine = createFsrsEngine(this.config);
  }

  /**
   * Cree l'etat d'une carte jamais revisee : due immediatement, sans trace
   * memoire ni historique.
   */
  public newState(now: Date = new Date()): SchedulingState {
    return this.#engine.emptyState(now);
  }

  /**
   * Applique une note et replanifie la carte.
   *
   * Ne mute pas `state` : renvoie le nouvel etat accompagne de sa trace
   * append-only.
   */
  public review(state: SchedulingState, grade: ReviewGrade, now: Date): ReviewResult {
    const next = this.#engine.next(state, grade, now);

    return {
      state: next,
      log: {
        grade,
        reviewedAt: now,
        stateBefore: state,
        stateAfter: next,
      },
    };
  }

  /**
   * Calcule les 4 issues possibles sans rien appliquer — de quoi afficher
   * l'intervalle sous chacun des 4 boutons de revision.
   *
   * Les issues sont renvoyees dans l'ordre de `REVIEW_GRADES`, donc a
   * intervalles croissants.
   */
  public preview(state: SchedulingState, now: Date): SchedulingPreview {
    return [
      this.#outcome(state, 'Again', now),
      this.#outcome(state, 'Hard', now),
      this.#outcome(state, 'Good', now),
      this.#outcome(state, 'Easy', now),
    ];
  }

  /**
   * Probabilite de rappel de l'item a l'instant `now` (0 a 1).
   *
   * Vaut 0 pour une carte jamais revisee. C'est cette valeur, et non la seule
   * date d'echeance, qui traduit l'etat reel de la memoire.
   */
  public retrievability(state: SchedulingState, now: Date): number {
    return this.#engine.retrievability(state, now);
  }

  /** Projette une note en issue affichable, sans l'appliquer. */
  #outcome(state: SchedulingState, grade: ReviewGrade, now: Date): ScheduledOutcome {
    const next = this.review(state, grade, now).state;

    return {
      grade,
      state: next,
      intervalMs: next.due.getTime() - now.getTime(),
    };
  }
}

/** Applique les defauts et verifie les invariantes de configuration. */
function resolveConfig(config: SchedulerConfig): ResolvedSchedulerConfig {
  const resolved: ResolvedSchedulerConfig = { ...DEFAULT_CONFIG, ...config };

  if (!Number.isFinite(resolved.requestRetention) || resolved.requestRetention <= 0 || resolved.requestRetention >= 1) {
    throw new SchedulerConfigError(
      `requestRetention doit etre strictement compris entre 0 et 1 (recu : ${String(resolved.requestRetention)}).`,
    );
  }

  if (!Number.isFinite(resolved.maximumInterval) || resolved.maximumInterval < 1) {
    throw new SchedulerConfigError(
      `maximumInterval doit valoir au moins 1 jour (recu : ${String(resolved.maximumInterval)}).`,
    );
  }

  return resolved;
}

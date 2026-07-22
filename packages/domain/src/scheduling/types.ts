/**
 * Vocabulaire de planification de BAYT (ubiquitous language).
 *
 * Ces types sont notre contrat public : ils sont volontairement independants de
 * la librairie de calcul utilisee sous le capot (ts-fsrs). Aucun type externe
 * ne doit apparaitre dans cette signature — cf. `ts-fsrs.adapter.ts`.
 */

/**
 * Les 4 notes de rappel proposees a l'apprenant, dans l'ordre du domaine.
 *
 * L'ordre compte : il pilote l'affichage des 4 boutons de revision et garantit
 * des intervalles croissants (`Again` = echec, `Easy` = rappel immediat).
 */
export const REVIEW_GRADES = ['Again', 'Hard', 'Good', 'Easy'] as const;

/** Note attribuee par l'apprenant a l'issue d'une revision. */
export type ReviewGrade = (typeof REVIEW_GRADES)[number];

/** Etapes du cycle de vie d'une carte pour un apprenant donne. */
export const LEARNING_STATES = ['new', 'learning', 'review', 'relearning'] as const;

/** Etat du cycle de vie d'une carte pour un apprenant donne. */
export type LearningState = (typeof LEARNING_STATES)[number];

/**
 * Trace memoire modelisee par FSRS pour un couple (apprenant, item).
 *
 * - `stability` : nombre de jours au bout desquels la probabilite de rappel
 *   retombe a 90 %. C'est le vrai indicateur de memorisation long terme.
 * - `difficulty` : difficulte intrinseque de l'item pour cet apprenant (1 a 10).
 *
 * Les deux valent 0 tant que la carte n'a jamais ete revisee.
 */
export interface MemoryState {
  readonly stability: number;
  readonly difficulty: number;
}

/**
 * Etat de planification complet d'un couple (apprenant, item).
 *
 * Immuable : chaque revision produit un nouvel etat, jamais une mutation.
 */
export interface SchedulingState {
  /** Trace memoire FSRS. */
  readonly memory: MemoryState;
  /** Position dans le cycle de vie. */
  readonly state: LearningState;
  /** Date a partir de laquelle la carte doit reapparaitre dans la file. */
  readonly due: Date;
  /** Date de la derniere revision, `null` tant qu'il n'y en a pas eu. */
  readonly lastReviewedAt: Date | null;
  /** Nombre total de revisions. */
  readonly reps: number;
  /** Nombre d'oublis (passages par `Again` depuis l'etat `review`). */
  readonly lapses: number;
  /**
   * Rang atteint dans les paliers d'apprentissage / reapprentissage
   * (les intervalles courts en minutes qui precedent la revision espacee).
   *
   * Fait partie de l'etat persistant : sans lui, une carte en cours
   * d'apprentissage repartirait au premier palier a chaque rechargement.
   */
  readonly learningStep: number;
}

/**
 * Trace d'une revision — **append-only**.
 *
 * On enregistre la transition complete avant -> apres : c'est la matiere
 * premiere de l'optimisation des parametres FSRS par utilisateur, des
 * analytics de progression et de la gamification. Un log n'est jamais
 * ecrase ni corrige (cf. lessons.md L002).
 */
export interface ReviewLog {
  readonly grade: ReviewGrade;
  readonly reviewedAt: Date;
  readonly stateBefore: SchedulingState;
  readonly stateAfter: SchedulingState;
}

/** Resultat d'une revision : le nouvel etat et sa trace. */
export interface ReviewResult {
  readonly state: SchedulingState;
  readonly log: ReviewLog;
}

/** Issue possible d'une note, telle qu'affichee sous un bouton de revision. */
export interface ScheduledOutcome {
  readonly grade: ReviewGrade;
  /** Etat qui serait obtenu si l'apprenant choisissait cette note. */
  readonly state: SchedulingState;
  /** Delai avant la prochaine echeance, en millisecondes. */
  readonly intervalMs: number;
}

/** Les 4 issues d'une revision, dans l'ordre de `REVIEW_GRADES`. */
export type SchedulingPreview = readonly [
  ScheduledOutcome,
  ScheduledOutcome,
  ScheduledOutcome,
  ScheduledOutcome,
];

/** Reglages de planification, tous optionnels. */
export interface SchedulerConfig {
  /**
   * Probabilite de rappel visee au moment de la revision (0 exclu, 1 exclu).
   * Plus elle est haute, plus les intervalles sont courts et l'effort eleve.
   *
   * @default 0.9
   */
  readonly requestRetention?: number;
  /**
   * Intervalle maximum, en jours.
   *
   * Le plafond s'applique a l'intervalle calcule par FSRS. L'ordre strict des
   * 4 boutons est ensuite garanti (`Again` < `Hard` < `Good` < `Easy`), ce qui
   * peut ajouter jusqu'a 3 jours au-dela du plafond pour la note `Easy`.
   *
   * @default 36500
   */
  readonly maximumInterval?: number;
  /**
   * Bruit aleatoire sur les intervalles, pour eviter les pics de charge quand
   * beaucoup de cartes ont ete apprises le meme jour.
   *
   * Desactive par defaut : le domaine reste deterministe et testable.
   *
   * @default false
   */
  readonly enableFuzz?: boolean;
}

/** Configuration effective, une fois les defauts appliques. */
export type ResolvedSchedulerConfig = Required<SchedulerConfig>;

import type { ReviewGrade } from '@bayt/domain';

/**
 * Port d'**agrégation des statistiques** de l'écran Profil.
 *
 * Toutes les valeurs se déduisent des données déjà stockées (FSRS, révisions,
 * complétions) — **aucune nouvelle source de vérité**. Les calculs de mise en
 * forme (XP/jour, séries) vivent dans le cas d'usage, à partir de ces agrégats
 * bruts ; le repository ne fait que compter et lire.
 */

/** Répartition des cartes par état de mémoire FSRS (santé de la mémoire). */
export interface MemoryHealthCounts {
  /** Cartes jamais planifiées pour l'apprenant (aucune ligne d'état). */
  readonly newCount: number;
  readonly learning: number;
  readonly review: number;
  readonly relearning: number;
  /** Total des cartes du catalogue (borne les autres comptes). */
  readonly total: number;
}

/** Maîtrise d'un domaine : cartes en révision (ancrées) sur le total du domaine. */
export interface DomainMasteryRow {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly color: string;
  readonly position: number;
  readonly total: number;
  readonly mastered: number;
}

/** Un événement de révision brut (pour reconstruire l'activité par jour). */
export interface ReviewEvent {
  /** Instant de la révision, epoch ms. */
  readonly reviewedAt: number;
  readonly grade: ReviewGrade;
}

export interface ProfileStatsRepository {
  /** Répartition des cartes par état FSRS. */
  memoryHealth(userId: string): Promise<MemoryHealthCounts>;

  /** Nombre de leçons terminées par l'apprenant. */
  lessonsCompleted(userId: string): Promise<number>;

  /** Maîtrise par domaine ayant du contenu (total > 0), ordonnée par rang. */
  domainMastery(userId: string): Promise<readonly DomainMasteryRow[]>;

  /** Révisions de l'apprenant depuis `sinceMs` (epoch ms), pour l'activité. */
  reviewEvents(userId: string, sinceMs: number): Promise<readonly ReviewEvent[]>;
}

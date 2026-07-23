import type { UserProgress } from '@bayt/domain';

/**
 * Port de persistance de la progression de gamification.
 *
 * Se teste avec une implémentation en mémoire, sans D1.
 */
export interface ProgressRepository {
  /** Progression d'un apprenant, ou `null` s'il n'a jamais rien gagné. */
  find(userId: string): Promise<UserProgress | null>;

  /** Écrit (crée ou remplace) la progression d'un apprenant. */
  save(userId: string, progress: UserProgress): Promise<void>;
}

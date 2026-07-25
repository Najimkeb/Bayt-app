import type {
  DomainMasteryRow,
  MemoryHealthCounts,
  ProfileStatsRepository,
  ReviewEvent,
} from '../../application/ports/profile-stats-repository.js';

/** Données injectables pour l'implémentation en mémoire (tests). */
export interface InMemoryStats {
  readonly memoryHealth?: MemoryHealthCounts;
  readonly lessonsCompleted?: number;
  readonly domainMastery?: readonly DomainMasteryRow[];
  readonly reviewEvents?: readonly ReviewEvent[];
}

const EMPTY_HEALTH: MemoryHealthCounts = {
  newCount: 0,
  learning: 0,
  review: 0,
  relearning: 0,
  total: 0,
};

/** Implémentation en mémoire des agrégats de profil (tests, sans D1). */
export class InMemoryProfileStatsRepository implements ProfileStatsRepository {
  public constructor(private readonly data: InMemoryStats = {}) {}

  public memoryHealth(): Promise<MemoryHealthCounts> {
    return Promise.resolve(this.data.memoryHealth ?? EMPTY_HEALTH);
  }

  public lessonsCompleted(): Promise<number> {
    return Promise.resolve(this.data.lessonsCompleted ?? 0);
  }

  public domainMastery(): Promise<readonly DomainMasteryRow[]> {
    return Promise.resolve(this.data.domainMastery ?? []);
  }

  public reviewEvents(_userId: string, sinceMs: number): Promise<readonly ReviewEvent[]> {
    return Promise.resolve((this.data.reviewEvents ?? []).filter((e) => e.reviewedAt >= sinceMs));
  }
}

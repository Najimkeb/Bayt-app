/**
 * Contrat HTTP de l'écran Profil, vu du navigateur.
 *
 * Miroir de `ProfileData` de l'API (`get-profile.ts`). Chaque champ dérive d'une
 * donnée réellement stockée — aucune métrique inventée.
 */

export interface ProfileUser {
  readonly name: string;
  readonly email: string;
  /** Date d'inscription, ISO 8601. */
  readonly memberSince: string;
  readonly isAdmin: boolean;
}

export interface ProfileStats {
  readonly currentStreak: number;
  readonly longestStreak: number;
  readonly xpTotal: number;
  readonly cardsMastered: number;
  readonly lessonsCompleted: number;
}

/** Répartition des cartes par état de mémoire FSRS. */
export interface MemoryHealth {
  readonly newCards: number;
  readonly learning: number;
  readonly review: number;
  readonly relearning: number;
  readonly total: number;
}

export interface DomainMastery {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly color: string;
  readonly mastered: number;
  readonly total: number;
}

export interface DailyXpPoint {
  readonly day: string;
  readonly xp: number;
}

export interface HeatmapCell {
  readonly day: string;
  readonly count: number;
}

export interface ProfileActivity {
  /** Assez d'historique (≥ 7 jours d'étude) pour montrer des tendances honnêtes. */
  readonly hasEnoughHistory: boolean;
  readonly distinctStudyDays: number;
  readonly trendDays: number;
  readonly dailyXp: readonly DailyXpPoint[];
  readonly heatmap: readonly HeatmapCell[];
}

export interface ProfileData {
  readonly user: ProfileUser;
  readonly stats: ProfileStats;
  readonly memoryHealth: MemoryHealth;
  readonly domains: readonly DomainMastery[];
  readonly activity: ProfileActivity;
  readonly settings: { readonly dailyGoal: number };
}

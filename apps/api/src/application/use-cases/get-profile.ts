import { dailyStatus, initialProgress, localDay, xpForEvent } from '@bayt/domain';

import type { IdentityRepository } from '../ports/identity-repository.js';
import type { ProgressRepository } from '../ports/progress-repository.js';
import type {
  DomainMasteryRow,
  ProfileStatsRepository,
  ReviewEvent,
} from '../ports/profile-stats-repository.js';

/** Fenêtre du graphique de tendance XP (jours). */
export const XP_TREND_DAYS = 30;

/** Fenêtre du calendrier d'assiduité (jours ~ 12 semaines). */
export const HEATMAP_DAYS = 84;

/** Jours d'étude distincts requis pour débloquer les tendances. */
export const MIN_STUDY_DAYS_FOR_TRENDS = 7;

const DAY_MS = 86_400_000;

/** Un point du graphique XP par jour. */
export interface DailyXpPoint {
  readonly day: string;
  readonly xp: number;
}

/** Une case du calendrier d'assiduité. */
export interface HeatmapCell {
  readonly day: string;
  readonly count: number;
}

/** Données complètes de l'écran Profil (agrégées, dérivées des données stockées). */
export interface ProfileData {
  readonly user: {
    readonly name: string;
    readonly email: string;
    /** Date d'inscription, ISO 8601. */
    readonly memberSince: string;
    readonly isAdmin: boolean;
  };
  readonly stats: {
    readonly currentStreak: number;
    readonly longestStreak: number;
    readonly xpTotal: number;
    readonly cardsMastered: number;
    readonly lessonsCompleted: number;
  };
  readonly memoryHealth: {
    readonly newCards: number;
    readonly learning: number;
    readonly review: number;
    readonly relearning: number;
    readonly total: number;
  };
  readonly domains: readonly {
    readonly id: string;
    readonly name: string;
    readonly icon: string;
    readonly color: string;
    readonly mastered: number;
    readonly total: number;
  }[];
  readonly activity: {
    /** Assez d'historique pour montrer des tendances honnêtes ? */
    readonly hasEnoughHistory: boolean;
    readonly distinctStudyDays: number;
    readonly trendDays: number;
    readonly dailyXp: readonly DailyXpPoint[];
    readonly heatmap: readonly HeatmapCell[];
  };
  readonly settings: {
    readonly dailyGoal: number;
  };
}

/** Compte introuvable pour un `userId` authentifié (incohérence rare → 404). */
export class ProfileNotFoundError extends Error {
  public constructor(userId: string) {
    super(`Profil introuvable pour l'utilisateur ${userId}`);
    this.name = 'ProfileNotFoundError';
  }
}

/** Décale un jour `YYYY-MM-DD` de `delta` jours calendaires. */
function shiftDay(day: string, delta: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + delta * DAY_MS).toISOString().slice(0, 10);
}

/** Les `n` derniers jours calendaires jusqu'à `today` inclus, du plus ancien au plus récent. */
function lastDays(today: string, n: number): string[] {
  return Array.from({ length: n }, (_v, i) => shiftDay(today, -(n - 1 - i)));
}

/**
 * Cas d'usage « donne-moi mon profil et mes statistiques ».
 *
 * Combine identité, progression (gamification) et agrégats FSRS/révisions. Rien
 * n'est inventé : chaque chiffre dérive d'une donnée réellement stockée. Les
 * tendances (XP par jour) ne sont exposées qu'à partir de 7 jours d'étude
 * distincts — sinon `hasEnoughHistory` est faux et l'UI invite à continuer.
 */
export class GetProfile {
  public constructor(
    private readonly identity: IdentityRepository,
    private readonly progress: ProgressRepository,
    private readonly stats: ProfileStatsRepository,
  ) {}

  public async execute(userId: string, now: Date, timeZone: string): Promise<ProfileData> {
    const identity = await this.identity.findById(userId);
    if (identity === null) {
      throw new ProfileNotFoundError(userId);
    }

    // Fenêtre d'événements : le calendrier (le plus large), +1 jour de marge pour
    // les bascules de fuseau aux bords.
    const sinceMs = now.getTime() - (HEATMAP_DAYS + 1) * DAY_MS;

    const [progress, health, lessonsCompleted, domainRows, events] = await Promise.all([
      this.progress.find(userId),
      this.stats.memoryHealth(userId),
      this.stats.lessonsCompleted(userId),
      this.stats.domainMastery(userId),
      this.stats.reviewEvents(userId, sinceMs),
    ]);

    const status = dailyStatus(progress ?? initialProgress(), now, timeZone);
    const today = localDay(now, timeZone);

    const { xpByDay, countByDay } = this.bucket(events, timeZone);

    const dailyXp: DailyXpPoint[] = lastDays(today, XP_TREND_DAYS).map((day) => ({
      day,
      xp: xpByDay.get(day) ?? 0,
    }));
    const heatmap: HeatmapCell[] = lastDays(today, HEATMAP_DAYS).map((day) => ({
      day,
      count: countByDay.get(day) ?? 0,
    }));
    const distinctStudyDays = heatmap.filter((cell) => cell.count > 0).length;

    return {
      user: {
        name: identity.name,
        email: identity.email,
        memberSince: new Date(identity.createdAt).toISOString(),
        // Détection admin **fiable** : le rôle vient de la base, pas d'une config.
        isAdmin: identity.role === 'admin',
      },
      stats: {
        currentStreak: status.streak,
        longestStreak: status.longestStreak,
        xpTotal: status.xpTotal,
        cardsMastered: health.review,
        lessonsCompleted,
      },
      memoryHealth: {
        newCards: health.newCount,
        learning: health.learning,
        review: health.review,
        relearning: health.relearning,
        total: health.total,
      },
      domains: domainRows.map((d: DomainMasteryRow) => ({
        id: d.id,
        name: d.name,
        icon: d.icon,
        color: d.color,
        mastered: d.mastered,
        total: d.total,
      })),
      activity: {
        hasEnoughHistory: distinctStudyDays >= MIN_STUDY_DAYS_FOR_TRENDS,
        distinctStudyDays,
        trendDays: XP_TREND_DAYS,
        dailyXp,
        heatmap,
      },
      settings: {
        dailyGoal: status.dailyGoal,
      },
    };
  }

  /** Range les révisions par jour local : XP (via le domaine) et nombre. */
  private bucket(
    events: readonly ReviewEvent[],
    timeZone: string,
  ): { xpByDay: Map<string, number>; countByDay: Map<string, number> } {
    const xpByDay = new Map<string, number>();
    const countByDay = new Map<string, number>();

    for (const event of events) {
      const day = localDay(new Date(event.reviewedAt), timeZone);
      xpByDay.set(day, (xpByDay.get(day) ?? 0) + xpForEvent({ type: 'review', grade: event.grade }));
      countByDay.set(day, (countByDay.get(day) ?? 0) + 1);
    }

    return { xpByDay, countByDay };
  }
}

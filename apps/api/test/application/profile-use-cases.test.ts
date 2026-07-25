import { initialProgress } from '@bayt/domain';
import { describe, expect, it } from 'vitest';

import { GetProfile } from '../../src/application/use-cases/get-profile.js';
import { SetDailyGoal } from '../../src/application/use-cases/set-daily-goal.js';
import type { UserIdentity } from '../../src/application/ports/identity-repository.js';
import type { ReviewEvent } from '../../src/application/ports/profile-stats-repository.js';
import { InMemoryIdentityRepository } from '../../src/infrastructure/repositories/in-memory-identity.repository.js';
import { InMemoryProfileStatsRepository } from '../../src/infrastructure/repositories/in-memory-profile-stats.repository.js';
import { InMemoryProgressRepository } from '../../src/infrastructure/repositories/in-memory-progress.repository.js';

const NOW = new Date('2026-03-15T12:00:00Z');
const TZ = 'UTC';

const IDENTITY: UserIdentity = {
  id: 'demo',
  name: 'Najim',
  email: 'najim@example.com',
  createdAt: Date.parse('2026-01-01T00:00:00Z'),
};

/** Un événement de révision à un jour donné (midi UTC). */
function reviewOn(day: string, grade: ReviewEvent['grade']): ReviewEvent {
  return { reviewedAt: Date.parse(`${day}T12:00:00Z`), grade };
}

describe('GetProfile', () => {
  it('agrège identité, stats et santé mémoire depuis les données stockées', async () => {
    const progress = new InMemoryProgressRepository();
    await progress.save('demo', {
      ...initialProgress(50),
      xpTotal: 320,
      streak: 4,
      longestStreak: 9,
      lastGoalDay: '2026-03-15',
    });

    const stats = new InMemoryProfileStatsRepository({
      memoryHealth: { newCount: 10, learning: 3, review: 7, relearning: 2, total: 22 },
      lessonsCompleted: 5,
      domainMastery: [
        { id: 'dom_apprendre', name: 'Apprendre', icon: 'Brain', color: 'green', position: 0, total: 12, mastered: 7 },
      ],
      reviewEvents: [],
    });

    const profile = await new GetProfile(
      new InMemoryIdentityRepository([IDENTITY]),
      progress,
      stats,
    ).execute('demo', NOW, TZ);

    expect(profile.user.name).toBe('Najim');
    expect(profile.user.memberSince).toBe('2026-01-01T00:00:00.000Z');
    expect(profile.user.isAdmin).toBe(false);
    expect(profile.stats).toMatchObject({
      currentStreak: 4,
      longestStreak: 9,
      xpTotal: 320,
      cardsMastered: 7, // = cartes en état review
      lessonsCompleted: 5,
    });
    expect(profile.memoryHealth).toEqual({
      newCards: 10,
      learning: 3,
      review: 7,
      relearning: 2,
      total: 22,
    });
    expect(profile.domains).toHaveLength(1);
    expect(profile.domains[0]).toMatchObject({ id: 'dom_apprendre', mastered: 7, total: 12 });
    expect(profile.settings.dailyGoal).toBe(50);
  });

  it('reconstruit l’XP par jour depuis les notes de révision (via le domaine)', async () => {
    const stats = new InMemoryProfileStatsRepository({
      reviewEvents: [
        reviewOn('2026-03-15', 'Good'), // 8
        reviewOn('2026-03-15', 'Easy'), // 10
        reviewOn('2026-03-14', 'Again'), // 4
      ],
    });

    const profile = await new GetProfile(
      new InMemoryIdentityRepository([IDENTITY]),
      new InMemoryProgressRepository(),
      stats,
    ).execute('demo', NOW, TZ);

    expect(profile.activity.dailyXp).toHaveLength(30);
    const today = profile.activity.dailyXp.at(-1);
    const yesterday = profile.activity.dailyXp.at(-2);
    expect(today).toEqual({ day: '2026-03-15', xp: 18 });
    expect(yesterday).toEqual({ day: '2026-03-14', xp: 4 });
  });

  it('cache les tendances tant qu’il y a moins de 7 jours d’étude', async () => {
    const fewDays = new InMemoryProfileStatsRepository({
      reviewEvents: ['2026-03-15', '2026-03-14', '2026-03-13'].map((d) => reviewOn(d, 'Good')),
    });

    const profile = await new GetProfile(
      new InMemoryIdentityRepository([IDENTITY]),
      new InMemoryProgressRepository(),
      fewDays,
    ).execute('demo', NOW, TZ);

    expect(profile.activity.distinctStudyDays).toBe(3);
    expect(profile.activity.hasEnoughHistory).toBe(false);
  });

  it('débloque les tendances à partir de 7 jours d’étude distincts', async () => {
    const days = ['09', '10', '11', '12', '13', '14', '15'].map((d) => `2026-03-${d}`);
    const enough = new InMemoryProfileStatsRepository({
      reviewEvents: days.map((d) => reviewOn(d, 'Good')),
    });

    const profile = await new GetProfile(
      new InMemoryIdentityRepository([IDENTITY]),
      new InMemoryProgressRepository(),
      enough,
    ).execute('demo', NOW, TZ);

    expect(profile.activity.distinctStudyDays).toBe(7);
    expect(profile.activity.hasEnoughHistory).toBe(true);
  });

  it('marque admin quand l’email figure dans la liste (insensible à la casse)', async () => {
    const profile = await new GetProfile(
      new InMemoryIdentityRepository([IDENTITY]),
      new InMemoryProgressRepository(),
      new InMemoryProfileStatsRepository(),
      new Set(['najim@example.com']),
    ).execute('demo', NOW, TZ);

    expect(profile.user.isAdmin).toBe(true);
  });

  it('lève une erreur si le compte est introuvable', async () => {
    await expect(
      new GetProfile(
        new InMemoryIdentityRepository([]),
        new InMemoryProgressRepository(),
        new InMemoryProfileStatsRepository(),
      ).execute('inconnu', NOW, TZ),
    ).rejects.toThrow(/introuvable/);
  });
});

describe('SetDailyGoal', () => {
  it('modifie uniquement l’objectif, sans toucher au reste', async () => {
    const progress = new InMemoryProgressRepository();
    await progress.save('demo', { ...initialProgress(50), xpTotal: 100, xpToday: 30, day: '2026-03-15' });

    const status = await new SetDailyGoal(progress).execute('demo', 80, NOW, TZ);

    expect(status.dailyGoal).toBe(80);
    expect(status.xpTotal).toBe(100);
    expect((await progress.find('demo'))?.dailyGoal).toBe(80);
  });

  it('part d’une progression vierge si l’apprenant n’a rien encore', async () => {
    const progress = new InMemoryProgressRepository();
    const status = await new SetDailyGoal(progress).execute('demo', 100, NOW, TZ);

    expect(status.dailyGoal).toBe(100);
    expect(status.xpTotal).toBe(0);
  });
});

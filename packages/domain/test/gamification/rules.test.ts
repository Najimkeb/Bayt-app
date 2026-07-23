import { describe, expect, it } from 'vitest';

import {
  applyXp,
  currentStreak,
  dailyStatus,
  daysBetween,
  initialProgress,
  localDay,
  xpForEvent,
  type UserProgress,
} from '../../src/index.js';

const TZ = 'Europe/Paris';

/** Un instant à midi, jour local donné (Paris = UTC+1/+2, midi reste le même jour). */
function noonUtc(date: string): Date {
  return new Date(`${date}T12:00:00Z`);
}

describe('xpForEvent', () => {
  it('accorde de l\'XP par note de révision', () => {
    expect(xpForEvent({ type: 'review', grade: 'Good' })).toBe(8);
    expect(xpForEvent({ type: 'review', grade: 'Again' })).toBe(4);
  });

  it('accorde de l\'XP à un exercice réussi, rien à un raté', () => {
    expect(xpForEvent({ type: 'exercise', correct: true })).toBe(10);
    expect(xpForEvent({ type: 'exercise', correct: false })).toBe(0);
  });
});

describe('localDay — robustesse au fuseau', () => {
  it('place un instant tard le soir au bon jour local', () => {
    // 22:30 UTC le 1er mars = 23:30 à Paris (même jour) mais 14:30 à Los Angeles.
    const instant = new Date('2026-03-01T22:30:00Z');
    expect(localDay(instant, 'Europe/Paris')).toBe('2026-03-01');
    expect(localDay(instant, 'America/Los_Angeles')).toBe('2026-03-01');
  });

  it('bascule de jour selon le fuseau', () => {
    // 23:30 UTC = 00:30 le 2 mars à Paris, mais encore le 1er à Los Angeles.
    const instant = new Date('2026-03-01T23:30:00Z');
    expect(localDay(instant, 'Europe/Paris')).toBe('2026-03-02');
    expect(localDay(instant, 'America/Los_Angeles')).toBe('2026-03-01');
  });

  it('retombe sur UTC pour un fuseau invalide', () => {
    expect(localDay(new Date('2026-03-01T12:00:00Z'), 'Pas/Un/Fuseau')).toBe('2026-03-01');
  });
});

describe('daysBetween', () => {
  it('compte les jours calendaires', () => {
    expect(daysBetween('2026-03-01', '2026-03-02')).toBe(1);
    expect(daysBetween('2026-03-01', '2026-03-01')).toBe(0);
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1);
  });
});

describe('applyXp — XP du jour et objectif', () => {
  it('accumule l\'XP du jour et le total', () => {
    let p = initialProgress();
    p = applyXp(p, { type: 'exercise', correct: true }, noonUtc('2026-03-01'), TZ).progress;
    p = applyXp(p, { type: 'review', grade: 'Good' }, noonUtc('2026-03-01'), TZ).progress;

    expect(p.xpToday).toBe(18);
    expect(p.xpTotal).toBe(18);
    expect(p.day).toBe('2026-03-01');
  });

  it('signale l\'atteinte de l\'objectif au moment exact', () => {
    let p = initialProgress(20);
    const first = applyXp(p, { type: 'exercise', correct: true }, noonUtc('2026-03-01'), TZ);
    expect(first.goalJustReached).toBe(false);

    const second = applyXp(first.progress, { type: 'exercise', correct: true }, noonUtc('2026-03-01'), TZ);
    expect(second.goalJustReached).toBe(true);
    expect(second.streakIncreased).toBe(true);
    expect(second.progress.streak).toBe(1);
    p = second.progress;

    // Un gain supplémentaire le même jour ne re-déclenche pas.
    const third = applyXp(p, { type: 'review', grade: 'Good' }, noonUtc('2026-03-01'), TZ);
    expect(third.goalJustReached).toBe(false);
    expect(third.progress.streak).toBe(1);
  });

  it('remet l\'XP du jour à zéro le lendemain', () => {
    let p = initialProgress(20);
    p = applyXp(p, { type: 'exercise', correct: true }, noonUtc('2026-03-01'), TZ).progress;
    expect(p.xpToday).toBe(10);

    p = applyXp(p, { type: 'exercise', correct: true }, noonUtc('2026-03-02'), TZ).progress;
    expect(p.xpToday).toBe(10); // repart de zéro puis +10
    expect(p.day).toBe('2026-03-02');
  });
});

describe('applyXp — série', () => {
  /** Atteint l'objectif (20 XP) un jour donné. */
  function meetGoal(p: UserProgress, date: string): UserProgress {
    let next = applyXp(p, { type: 'exercise', correct: true }, noonUtc(date), TZ).progress;
    next = applyXp(next, { type: 'exercise', correct: true }, noonUtc(date), TZ).progress;
    return next;
  }

  it('se prolonge sur des jours consécutifs', () => {
    let p = initialProgress(20);
    p = meetGoal(p, '2026-03-01');
    expect(p.streak).toBe(1);
    p = meetGoal(p, '2026-03-02');
    expect(p.streak).toBe(2);
    p = meetGoal(p, '2026-03-03');
    expect(p.streak).toBe(3);
    expect(p.longestStreak).toBe(3);
  });

  it('se rompt quand un jour est manqué', () => {
    let p = initialProgress(20);
    p = meetGoal(p, '2026-03-01');
    p = meetGoal(p, '2026-03-02');
    expect(p.streak).toBe(2);

    // On saute le 3, on revient le 4 → série repart à 1, record conservé.
    p = meetGoal(p, '2026-03-04');
    expect(p.streak).toBe(1);
    expect(p.longestStreak).toBe(2);
  });

  it('ne compte pas un jour sous l\'objectif', () => {
    let p = initialProgress(20);
    p = applyXp(p, { type: 'exercise', correct: true }, noonUtc('2026-03-01'), TZ).progress; // 10 < 20
    expect(p.streak).toBe(0);
  });
});

describe('currentStreak — vivacité à la lecture', () => {
  it('reste visible tant qu\'hier comptait', () => {
    let p = initialProgress(10);
    p = applyXp(p, { type: 'exercise', correct: true }, noonUtc('2026-03-01'), TZ).progress; // goal 10 atteint
    expect(p.streak).toBe(1);

    // Le lendemain, avant tout gain : la flamme tient encore.
    expect(currentStreak(p, noonUtc('2026-03-02'), TZ)).toBe(1);
    // Deux jours plus tard sans activité : rompue.
    expect(currentStreak(p, noonUtc('2026-03-03'), TZ)).toBe(0);
  });
});

describe('dailyStatus', () => {
  it('dérive la progression du jour', () => {
    let p = initialProgress(50);
    p = applyXp(p, { type: 'review', grade: 'Good' }, noonUtc('2026-03-01'), TZ).progress; // +8

    const status = dailyStatus(p, noonUtc('2026-03-01'), TZ);
    expect(status.xpToday).toBe(8);
    expect(status.dailyGoal).toBe(50);
    expect(status.goalMet).toBe(false);
    expect(status.ratio).toBeCloseTo(0.16);
  });

  it('remet à zéro l\'XP du jour affiché un autre jour', () => {
    let p = initialProgress(50);
    p = applyXp(p, { type: 'review', grade: 'Good' }, noonUtc('2026-03-01'), TZ).progress;

    expect(dailyStatus(p, noonUtc('2026-03-02'), TZ).xpToday).toBe(0);
  });
});

'use client';

import { Mascot } from '@bayt/ui';
import type { ReactElement } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts';

import type { DailyXpPoint, ProfileActivity } from '@/lib/api/profile-types';
import { paletteFor } from '@/lib/domain-colors';

/** Jour `YYYY-MM-DD` → `JJ/MM`. */
function shortDay(day: string): string {
  return `${day.slice(8)}/${day.slice(5, 7)}`;
}

/**
 * Graphique d'activité : XP gagné par jour sur la fenêtre de tendance.
 *
 * **Honnêteté** : tant que l'apprenant n'a pas assez d'historique (< 7 jours
 * d'étude), on n'affiche pas un graphique trompeur mais une invitation à
 * continuer. Le graphique a toujours une **alternative textuelle** (tableau
 * accessible) : le SVG est masqué aux lecteurs d'écran.
 */
export function ActivityChart({ activity }: { activity: ProfileActivity }): ReactElement {
  if (!activity.hasEnoughHistory) {
    return <LockedTrends studyDays={activity.distinctStudyDays} />;
  }

  const data = activity.dailyXp;
  const total = data.reduce((sum, point) => sum + point.xp, 0);
  const best = data.reduce((max, point) => Math.max(max, point.xp), 0);
  const green = paletteFor('green').fill;

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border-2 border-border bg-surface p-4">
      <p className="text-sm font-bold text-muted-foreground">
        <span className="font-black text-foreground">{total.toLocaleString('fr-FR')} XP</span> sur les{' '}
        {activity.trendDays} derniers jours · meilleur jour {best.toLocaleString('fr-FR')} XP
      </p>

      {/* SVG décoratif : masqué aux lecteurs d'écran (le tableau ci-dessous le double). */}
      <div aria-hidden="true" className="h-56 w-full text-muted-foreground">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[...data]} margin={{ top: 8, right: 4, bottom: 0, left: -16 }}>
            <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.15} />
            <XAxis
              dataKey="day"
              tickFormatter={shortDay}
              tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 700 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              allowDecimals={false}
              width={40}
              tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 700 }}
              tickLine={false}
              axisLine={false}
            />
            <Bar dataKey="xp" fill={green} radius={[4, 4, 0, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <AccessibleTable data={data} />
    </div>
  );
}

/** Alternative textuelle : un tableau des jours non nuls (masqué visuellement). */
function AccessibleTable({ data }: { data: readonly DailyXpPoint[] }): ReactElement {
  const active = data.filter((point) => point.xp > 0);

  return (
    <table className="sr-only">
      <caption>XP gagné par jour sur les {data.length} derniers jours</caption>
      <thead>
        <tr>
          <th scope="col">Jour</th>
          <th scope="col">XP</th>
        </tr>
      </thead>
      <tbody>
        {active.map((point) => (
          <tr key={point.day}>
            <td>{point.day}</td>
            <td>{point.xp}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** État « pas encore assez de données » — honnête, encourageant. */
function LockedTrends({ studyDays }: { studyDays: number }): ReactElement {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius-card)] border-2 border-border bg-surface p-8 text-center">
      <Mascot mood="encouraging" size="md" priority />
      <p className="text-lg font-extrabold">Tes tendances arrivent bientôt</p>
      <p className="max-w-sm text-sm font-bold text-muted-foreground">
        Continue à réviser pour débloquer ton graphique d&apos;activité, il te faut{' '}
        <span className="font-black text-foreground">7 jours d&apos;étude</span>, tu en es à{' '}
        <span className="font-black text-foreground">{studyDays}</span>. Chaque jour compte !
      </p>
    </div>
  );
}

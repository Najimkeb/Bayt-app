'use client';

import type { ReactElement } from 'react';

import { useProgress } from '@/lib/api/progress-queries';
import { useUserId } from '@/lib/auth/use-user-id';

import { GoalRing } from './goal-ring';

/**
 * Barre de progression persistante de l'en-tête : série (flamme), XP du jour
 * (éclair) et anneau vers l'objectif quotidien.
 *
 * Visible sur tous les écrans. Si l'API est injoignable, elle s'efface plutôt
 * que de casser l'en-tête.
 */
export function ProgressHeader(): ReactElement | null {
  const progress = useProgress(useUserId());

  if (progress.data === undefined) {
    return null;
  }

  const { streak, xpToday, dailyGoal, ratio, goalMet } = progress.data;

  return (
    <div className="flex items-center gap-2.5 sm:gap-4" aria-label="Ta progression du jour">
      <Stat
        icon="🔥"
        value={streak}
        tone="flame"
        srLabel={`Série de ${String(streak)} jour${streak > 1 ? 's' : ''}`}
      />
      <Stat
        icon="⚡"
        value={xpToday}
        tone="bolt"
        srLabel={`${String(xpToday)} XP aujourd'hui`}
      />
      <GoalRing ratio={ratio} met={goalMet}>
        {goalMet ? (
          <span aria-hidden="true" className="text-fox-orange">
            ✓
          </span>
        ) : (
          ''
        )}
      </GoalRing>
      <span className="sr-only">
        Objectif quotidien : {xpToday} sur {dailyGoal} XP{goalMet ? ', atteint' : ''}.
      </span>
    </div>
  );
}

/** Une pastille chiffrée (flamme ou éclair). */
function Stat({
  icon,
  value,
  tone,
  srLabel,
}: {
  icon: string;
  value: number;
  tone: 'flame' | 'bolt';
  srLabel: string;
}): ReactElement {
  return (
    <span className="inline-flex items-center gap-1" role="img" aria-label={srLabel}>
      {/* `tone` distingue les deux pastilles pour un éventuel style futur. */}
      <span aria-hidden="true" className="text-base" data-tone={tone}>
        {icon}
      </span>
      {/* Chiffre en couleur de texte : contraste AA garanti (l'emoji porte la couleur). */}
      <span aria-hidden="true" className="text-sm font-extrabold tabular-nums text-foreground">
        {value}
      </span>
    </span>
  );
}

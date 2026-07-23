'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactElement } from 'react';

import { CountUp } from './count-up';

/** Récompense de fin de session : XP gagné, objectif, série. */
export interface XpRewardData {
  /** XP gagné pendant cette session. */
  readonly xpGained: number;
  /** L'objectif du jour a été atteint pendant cette session. */
  readonly goalReached: boolean;
  /** La série a augmenté pendant cette session. */
  readonly streakIncreased: boolean;
  /** Série courante après la session. */
  readonly streak: number;
  /** Objectif du jour déjà atteint (au global). */
  readonly goalMet: boolean;
}

/**
 * Bloc de récompense affiché sur l'écran de fin (leçon ou révision).
 *
 * Célébration spéciale quand l'objectif quotidien vient d'être atteint et quand
 * la série augmente.
 */
export function XpReward({ data }: { data: XpRewardData }): ReactElement {
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex w-full flex-col gap-3">
      {/* Compteur d'XP qui monte. */}
      <motion.div
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-center justify-center gap-2 rounded-[var(--radius-card)] border-2 border-bee bg-bee/10 px-5 py-4"
      >
        <span aria-hidden="true" className="text-2xl">
          ⚡
        </span>
        <p className="text-2xl font-black tabular-nums text-foreground">
          <span aria-hidden="true">+</span>
          <CountUp value={data.xpGained} />
          <span className="ml-1 text-base font-extrabold text-muted-foreground">XP</span>
        </p>
        <span className="sr-only">{data.xpGained} points d&apos;expérience gagnés</span>
      </motion.div>

      {(data.goalReached || data.streakIncreased) && (
        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-2"
        >
          {data.goalReached && (
            <Banner tone="green" icon="🎯" text="Objectif quotidien atteint !" />
          )}
          {data.streakIncreased && (
            <Banner
              tone="flame"
              icon="🔥"
              text={`Série de ${String(data.streak)} jour${data.streak > 1 ? 's' : ''} !`}
            />
          )}
        </motion.div>
      )}
    </div>
  );
}

function Banner({
  tone,
  icon,
  text,
}: {
  tone: 'green' | 'flame';
  icon: string;
  text: string;
}): ReactElement {
  return (
    <div
      role="status"
      className={`flex items-center justify-center gap-2 rounded-2xl border-2 px-4 py-2.5 text-base font-extrabold ${
        tone === 'green'
          ? 'border-feather-green bg-feather-green/10 text-feather-green'
          : 'border-cardinal bg-cardinal/10 text-cardinal'
      }`}
    >
      <span aria-hidden="true">{icon}</span>
      {text}
    </div>
  );
}

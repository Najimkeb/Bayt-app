'use client';

import { Button, Mascot } from '@bayt/ui';
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactElement } from 'react';

import { mascotMessage } from './mascot-message';

/**
 * Fin de session : le moment le plus important de la boucle.
 *
 * On celebre l'effort, pas la performance, et on explique ce qui se passe
 * ensuite — la revision espacee travaille pendant que l'apprenant fait autre
 * chose.
 */
export function SessionComplete({ onRefresh }: { onRefresh: () => void }): ReactElement {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="flex w-full max-w-md flex-col items-center gap-6 text-center"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Moment fort de la session : la mascotte prend toute la place. */}
      <Mascot mood="celebrating" size="lg" priority />

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Tout est révisé !</h1>
        <p className="text-base font-bold leading-relaxed text-muted-foreground">
          {mascotMessage('celebrating')}
        </p>
      </div>

      <p className="rounded-[var(--radius-card)] border-2 border-border bg-surface px-5 py-4 text-base font-bold leading-relaxed text-muted-foreground">
        Reviens quand les prochaines cartes arriveront à échéance : réviser trop tôt n&apos;apporte
        presque rien, c&apos;est l&apos;effort de rappel au bon moment qui consolide.
      </p>

      <Button variant="gray" onClick={onRefresh}>
        Vérifier à nouveau
      </Button>
    </motion.div>
  );
}

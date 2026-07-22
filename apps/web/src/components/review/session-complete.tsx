'use client';

import { Button } from '@bayt/ui';
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactElement } from 'react';

import { Mascot, mascotMessage } from '@/components/mascot';

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
      <Mascot mood="celebrating" className="size-28" />

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Tout est revise !</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {mascotMessage('celebrating')}
        </p>
      </div>

      <p className="rounded-2xl border border-border bg-surface px-5 py-4 text-sm leading-relaxed text-muted-foreground">
        Reviens quand les prochaines cartes arriveront a echeance : reviser trop tot n&apos;apporte
        presque rien, c&apos;est l&apos;effort de rappel au bon moment qui consolide.
      </p>

      <Button variant="secondary" onClick={onRefresh}>
        Verifier a nouveau
      </Button>
    </motion.div>
  );
}

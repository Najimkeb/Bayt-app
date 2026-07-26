'use client';

import { Mascot, buttonVariants } from '@bayt/ui';
import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import type { ReactElement } from 'react';

import { XpReward, type XpRewardData } from '@/components/progress/xp-reward';

/**
 * Fin de leçon célébratoire : mascotte `celebrating` en grand, XP gagné,
 * objectif et série.
 *
 * On célèbre l'effort et on rappelle ce qui se passe ensuite — les items révisés
 * reviendront au bon moment via la révision espacée.
 */
export function LessonComplete({
  title,
  reward,
}: {
  title: string;
  reward: XpRewardData;
}): ReactElement {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="flex w-full max-w-md flex-col items-center gap-6 text-center"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <Mascot mood="celebrating" size="lg" priority />

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Leçon terminée !</h1>
        <p className="text-base font-bold leading-relaxed text-muted-foreground">
          Bravo pour « {title} ». Chaque réponse a nourri ta mémoire — ces items
          reviendront au bon moment.
        </p>
      </div>

      <XpReward data={reward} />

      <Link href="/review" className={buttonVariants({ variant: 'brand', size: 'lg' })}>
        Réviser mes cartes
      </Link>
    </motion.div>
  );
}

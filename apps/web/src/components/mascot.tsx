'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactElement } from 'react';

/**
 * Humeurs de la mascotte BAYT.
 *
 * Ton : un mentor attentif. Encourageant sans exces, rassurant sans
 * condescendance. Jamais infantilisant : on ne felicite pas d'avoir clique, on
 * commente ce que la memoire est en train de faire.
 */
export type MascotMood = 'idle' | 'thinking' | 'encouraging' | 'reassuring' | 'celebrating';

/** Bayt, la petite maison-mentor : un foyer ou la connaissance s'installe. */
export function Mascot({
  mood = 'idle',
  className,
}: {
  mood?: MascotMood;
  className?: string;
}): ReactElement {
  const reduceMotion = useReducedMotion();

  const eyeCurve = mood === 'reassuring' ? 'M 0 2 Q 4 -2 8 2' : null;
  const isHappy = mood === 'encouraging' || mood === 'celebrating';

  return (
    <motion.svg
      viewBox="0 0 96 96"
      role="img"
      aria-hidden="true"
      className={className}
      initial={false}
      animate={
        reduceMotion
          ? {}
          : {
              y: mood === 'celebrating' ? [0, -8, 0] : [0, -3, 0],
              rotate: mood === 'celebrating' ? [0, -3, 3, 0] : 0,
            }
      }
      transition={{
        duration: mood === 'celebrating' ? 1.1 : 3.6,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {/* Halo chaleureux : la lumiere de la maison. */}
      <motion.circle
        cx="48"
        cy="52"
        r="34"
        fill="var(--color-primary)"
        initial={false}
        animate={{ opacity: isHappy ? 0.16 : 0.09 }}
        transition={{ duration: 0.4 }}
      />

      {/* Toit. */}
      <path
        d="M 48 16 L 82 44 L 14 44 Z"
        fill="var(--color-primary)"
        stroke="var(--color-primary)"
        strokeWidth="4"
        strokeLinejoin="round"
      />

      {/* Corps. */}
      <rect
        x="20"
        y="44"
        width="56"
        height="38"
        rx="10"
        fill="var(--color-surface)"
        stroke="var(--color-primary)"
        strokeWidth="4"
      />

      {/* Yeux — fermes en arc quand la mascotte rassure ou se rejouit. */}
      {eyeCurve === null && !isHappy ? (
        <>
          <motion.circle
            cx="38"
            cy="60"
            r="4"
            fill="var(--color-foreground)"
            animate={reduceMotion ? {} : { scaleY: [1, 0.1, 1] }}
            transition={{ duration: 0.22, repeat: Infinity, repeatDelay: 4.5 }}
            style={{ transformOrigin: '38px 60px' }}
          />
          <motion.circle
            cx="58"
            cy="60"
            r="4"
            fill="var(--color-foreground)"
            animate={reduceMotion ? {} : { scaleY: [1, 0.1, 1] }}
            transition={{ duration: 0.22, repeat: Infinity, repeatDelay: 4.5 }}
            style={{ transformOrigin: '58px 60px' }}
          />
        </>
      ) : (
        <>
          <path
            d="M 34 60 Q 38 55 42 60"
            fill="none"
            stroke="var(--color-foreground)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M 54 60 Q 58 55 62 60"
            fill="none"
            stroke="var(--color-foreground)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </>
      )}

      {/* Bouche. */}
      <motion.path
        initial={false}
        animate={{
          d: isHappy
            ? 'M 40 70 Q 48 78 56 70'
            : mood === 'reassuring'
              ? 'M 41 72 Q 48 76 55 72'
              : mood === 'thinking'
                ? 'M 42 72 L 54 72'
                : 'M 41 71 Q 48 75 55 71',
        }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        fill="none"
        stroke="var(--color-foreground)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* Etincelles de celebration. */}
      {mood === 'celebrating' && !reduceMotion && (
        <>
          {[
            { cx: 18, cy: 30, delay: 0 },
            { cx: 78, cy: 26, delay: 0.25 },
            { cx: 84, cy: 62, delay: 0.5 },
          ].map((spark) => (
            <motion.circle
              key={`${String(spark.cx)}-${String(spark.cy)}`}
              cx={spark.cx}
              cy={spark.cy}
              r="3"
              fill="var(--color-primary)"
              animate={{ opacity: [0, 1, 0], scale: [0.4, 1.3, 0.4] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: spark.delay }}
            />
          ))}
        </>
      )}
    </motion.svg>
  );
}

/** Message affiche a cote de la mascotte, selon le moment de la session. */
export function mascotMessage(mood: MascotMood, grade?: string): string {
  switch (mood) {
    case 'thinking':
      return 'Compare ta reponse a la solution, puis note honnetement ton rappel.';
    case 'encouraging':
      return grade === 'Easy'
        ? 'Solide. Cette carte reviendra plus tard, ta memoire tient.'
        : 'Bien rappele. On espace l\'intervalle en consequence.';
    case 'reassuring':
      return grade === 'Again'
        ? 'Oublier fait partie du processus. On la revoit tres vite, c\'est la que ca s\'ancre.'
        : 'Rappel laborieux, donc utile. On resserre un peu l\'intervalle.';
    case 'celebrating':
      return 'Ta file est vide. La memoire travaille maintenant en arriere-plan.';
    case 'idle':
    default:
      return 'Prends le temps de retrouver la reponse avant de la reveler.';
  }
}

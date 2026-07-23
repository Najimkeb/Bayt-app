'use client';

import { motion, useReducedMotion } from 'framer-motion';
import Image from 'next/image';
import type { ReactElement } from 'react';

import { cn } from '../lib/cn.js';

/**
 * Humeurs que la mascotte BAYT peut exprimer.
 *
 * Ton : un mentor attentif. Encourageant sans exces, rassurant sans
 * condescendance — jamais infantilisant.
 */
export type MascotMood = 'idle' | 'happy' | 'encouraging' | 'celebrating';

/** Une pose disponible : son illustration et sa description. */
export interface MascotPose {
  readonly src: string;
  /** Decrit ce que l'image montre, pour les lecteurs d'ecran. */
  readonly alt: string;
}

/**
 * Poses reellement disponibles, par humeur.
 *
 * **Volontairement incomplet.** Seules les illustrations livrees figurent ici ;
 * toute humeur absente retombe sur `idle` (cf. `resolvePose`). Ajouter une pose
 * plus tard tient en deux gestes : deposer l'image dans
 * `apps/web/public/mascot/`, ajouter une ligne ici. Aucun autre code ne bouge.
 *
 * `idle` est obligatoire par construction : c'est le filet de securite.
 */
export const MASCOT_POSES: { readonly idle: MascotPose } & Partial<
  Record<MascotMood, MascotPose>
> = {
  idle: {
    src: '/mascot/idle.png',
    alt: 'La mascotte BAYT, un renard en tenue brodée, bras croisés et sourire calme',
  },
  celebrating: {
    src: '/mascot/celebrating.png',
    alt: 'La mascotte BAYT, un renard en tenue brodée, bras levés et joyeux',
  },
};

/** Tailles d'affichage, en pixels — un contexte d'usage chacune. */
const SIZES = {
  /** En ligne, a cote d'un texte. */
  sm: 56,
  /** Panneau d'accompagnement pendant la revision. */
  md: 120,
  /** Moment fort : fin de session. */
  lg: 208,
} as const;

export type MascotSize = keyof typeof SIZES;

export interface MascotProps {
  readonly mood?: MascotMood;
  readonly size?: MascotSize;
  readonly className?: string;
  /** A activer quand la mascotte est visible des le premier rendu. */
  readonly priority?: boolean;
}

/**
 * Retourne la pose a afficher, avec repli automatique sur `idle`.
 *
 * Exportee pour etre testable : c'est la regle qui garantit qu'aucune humeur ne
 * peut casser l'affichage, meme si son illustration n'existe pas encore.
 */
export function resolvePose(mood: MascotMood): MascotPose {
  return MASCOT_POSES[mood] ?? MASCOT_POSES.idle;
}

/**
 * La mascotte BAYT, en illustration.
 *
 * Aucun cadre ni fond ajoute : la mascotte est simplement posee, detouree. Les
 * illustrations doivent donc etre fournies en PNG a fond transparent — sans
 * quoi un carre opaque apparait (visible surtout en Dark Mode).
 */
export function Mascot({
  mood = 'idle',
  size = 'md',
  className,
  priority = false,
}: MascotProps): ReactElement {
  const reduceMotion = useReducedMotion();
  const pose = resolvePose(mood);
  const pixels = SIZES[size];

  return (
    <motion.div
      // La cle relance l'animation a chaque changement de pose reellement visible.
      key={pose.src}
      className={cn('relative shrink-0', className)}
      // Boite carree : aucune deformation possible du carre source.
      style={{ width: pixels, height: pixels, aspectRatio: '1 / 1' }}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.86 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={
        reduceMotion
          ? { duration: 0.15 }
          : { type: 'spring', stiffness: 420, damping: 16, mass: 0.7 }
      }
    >
      {/*
        Pattern next/image `fill` : l'image remplit la boite carree parente
        (position relative) et `objectFit: contain` la contient sans jamais la
        deformer ni la recadrer. Le fit est pose en style inline, pas via une
        classe Tailwind (`object-contain` vient de ce paquet et n'est pas
        toujours regeneree par l'app consommatrice).
      */}
      <Image
        src={pose.src}
        alt={pose.alt}
        fill
        sizes={`${String(pixels)}px`}
        priority={priority}
        style={{ objectFit: 'contain' }}
      />
    </motion.div>
  );
}

'use client';

import { Surface } from '@bayt/ui';
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactElement } from 'react';

import type { DueCard } from '@/lib/api/types';

import { CardBack, CardFront } from './card-content';

/**
 * La carte de révision, avec son retournement.
 *
 * Tant que la réponse est cachée, la carte entière est un bouton : on peut la
 * taper, cliquer, ou appuyer sur Espace. Une fois révélée, elle redevient un
 * simple contenu — le clavier passe la main aux 4 boutons de notation.
 */
export function Flashcard({
  card,
  revealed,
  onReveal,
}: {
  card: DueCard;
  revealed: boolean;
  onReveal: () => void;
}): ReactElement {
  const reduceMotion = useReducedMotion();

  const face =
    'flip-face absolute inset-0 flex flex-col items-center justify-center gap-4 p-5 sm:gap-5 sm:p-8';

  return (
    <div className="flip-scene w-full">
      <motion.div
        className="relative w-full"
        style={{ transformStyle: 'preserve-3d', minHeight: 'clamp(17rem, 46vh, 24rem)' }}
        initial={false}
        animate={reduceMotion ? { opacity: 1 } : { rotateY: revealed ? 180 : 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        {/*
          Recto — la question.

          Les deux faces coexistent dans le DOM pour le retournement 3D. La face
          cachée est donc retirée de l'arbre d'accessibilité et du parcours
          clavier (`aria-hidden` + `inert`) : sans cela, un lecteur d'écran
          annoncerait la réponse avant que l'apprenant ne la révèle.
        */}
        <Surface
          role="group"
          aria-label="Question"
          aria-hidden={revealed}
          inert={revealed}
          className={`${face} ${reduceMotion && revealed ? 'invisible' : ''}`}
          style={{ transform: 'rotateY(0deg)' }}
        >
          <CardKind type={card.item.type} label="Question" />

          <CardFront card={card} />

          {!revealed && (
            <button
              type="button"
              onClick={onReveal}
              aria-keyshortcuts="Space"
              className="absolute inset-0 size-full cursor-pointer touch-manipulation rounded-[var(--radius-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span className="sr-only">{"Révéler la réponse (barre d'espace)"}</span>
            </button>
          )}
        </Surface>

        {/* Verso — la réponse. */}
        <Surface
          role="group"
          aria-label="Réponse"
          aria-hidden={!revealed}
          inert={!revealed}
          className={`${face} ${reduceMotion && !revealed ? 'invisible' : ''}`}
          style={{ transform: reduceMotion ? 'none' : 'rotateY(180deg)' }}
        >
          <CardKind type={card.item.type} label="Réponse" />

          <CardBack card={card} />
        </Surface>
      </motion.div>
    </div>
  );
}

/** Étiquette : type d'item et face affichée. */
function CardKind({ type, label }: { type: DueCard['item']['type']; label: string }): ReactElement {
  const kind =
    type === 'cloze' ? 'Texte à trous' : type === 'practice_case' ? 'Cas pratique' : 'Flashcard';

  return (
    <span className="absolute left-1/2 top-4 -translate-x-1/2 whitespace-nowrap text-[0.7rem] font-extrabold uppercase tracking-[0.14em] text-muted-foreground sm:top-6 sm:text-xs">
      {label} · {kind}
    </span>
  );
}

'use client';

import { Surface } from '@bayt/ui';
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactElement } from 'react';

import type { DueCard } from '@/lib/api/types';

/**
 * La carte de revision, avec son retournement.
 *
 * Tant que la reponse est cachee, la carte entiere est un bouton : on peut la
 * taper, cliquer, ou appuyer sur Espace. Une fois revelee, elle redevient un
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

  const face = 'flip-face absolute inset-0 flex flex-col items-center justify-center gap-4 p-8';

  return (
    <div className="flip-scene w-full">
      <motion.div
        className="relative w-full"
        style={{ transformStyle: 'preserve-3d', minHeight: 'clamp(18rem, 42vh, 24rem)' }}
        initial={false}
        animate={reduceMotion ? { opacity: 1 } : { rotateY: revealed ? 180 : 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        {/*
          Recto — la question.

          Les deux faces coexistent dans le DOM pour le retournement 3D. La face
          cachee est donc retiree de l'arbre d'accessibilite et du parcours
          clavier (`aria-hidden` + `inert`) : sans cela, un lecteur d'ecran
          annoncerait la reponse avant que l'apprenant ne la revele.
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

          <p className="text-balance text-center text-2xl font-medium leading-snug sm:text-3xl">
            {card.item.front}
          </p>

          {!revealed && (
            <button
              type="button"
              onClick={onReveal}
              aria-keyshortcuts="Space"
              className="absolute inset-0 size-full cursor-pointer rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span className="sr-only">{"Reveler la reponse (barre d'espace)"}</span>
            </button>
          )}
        </Surface>

        {/* Verso — la reponse. */}
        <Surface
          role="group"
          aria-label="Reponse"
          aria-hidden={!revealed}
          inert={!revealed}
          className={`${face} ${reduceMotion && !revealed ? 'invisible' : ''}`}
          style={{ transform: reduceMotion ? 'none' : 'rotateY(180deg)' }}
        >
          <CardKind type={card.item.type} label="Reponse" />

          <p className="text-balance text-center text-2xl font-medium leading-snug sm:text-3xl">
            {card.item.back}
          </p>

          <p className="text-center text-sm text-muted-foreground">{card.item.front}</p>
        </Surface>
      </motion.div>
    </div>
  );
}

/** Etiquette discrete : type d'item et face affichee. */
function CardKind({ type, label }: { type: DueCard['item']['type']; label: string }): ReactElement {
  const kind = type === 'cloze' ? 'Texte a trous' : type === 'practice_case' ? 'Cas pratique' : 'Flashcard';

  return (
    <span className="absolute top-6 left-1/2 -translate-x-1/2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {label} · {kind}
    </span>
  );
}

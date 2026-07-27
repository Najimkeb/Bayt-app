'use client';

import { Surface } from '@bayt/ui';
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactElement } from 'react';

import type { DomainOverview } from '@/lib/api/domain-types';
import type { DueCard } from '@/lib/api/types';
import { paletteFor } from '@/lib/domain-colors';
import { iconFor } from '@/lib/icon-map';

import { CardBack, CardFront } from './card-content';

/**
 * Domaine « langue » : ses cartes de vocabulaire testent le sens anglais → français
 * (mot anglais au recto). Identifiant du catalogue (migration 0007).
 */
const LANGUAGE_DOMAIN_ID = 'dom_anglais';

/**
 * La carte de révision, avec son retournement.
 *
 * Tant que la réponse est cachée, la carte entière est un bouton : on peut la
 * taper, cliquer, ou appuyer sur Espace. Une fois révélée, elle redevient un
 * simple contenu — le clavier passe la main aux 4 boutons de notation.
 */
export function Flashcard({
  card,
  domain,
  revealed,
  onReveal,
}: {
  card: DueCard;
  /** Domaine de la carte (badge), ou `null` si non catégorisé / inconnu. */
  domain?: DomainOverview | null | undefined;
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
          <CardHeader type={card.item.type} label="Question" domain={domain} />

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
          <CardHeader type={card.item.type} label="Réponse" domain={domain} />

          <CardBack card={card} />
        </Surface>
      </motion.div>
    </div>
  );
}

/** En-tête de carte : type d'item, face affichée, et badge de domaine discret. */
function CardHeader({
  type,
  label,
  domain,
}: {
  type: DueCard['item']['type'];
  label: string;
  domain?: DomainOverview | null | undefined;
}): ReactElement {
  const kind =
    type === 'cloze' ? 'Texte à trous' : type === 'practice_case' ? 'Cas pratique' : 'Flashcard';

  return (
    <div className="absolute inset-x-0 top-4 flex flex-col items-center gap-1.5 sm:top-6">
      <span className="whitespace-nowrap text-[0.7rem] font-extrabold uppercase tracking-[0.14em] text-muted-foreground sm:text-xs">
        {label} · {kind}
      </span>
      {domain != null && <DomainBadge domain={domain} />}
    </div>
  );
}

/** Badge discret du domaine (icône + nom, à la couleur du domaine) + sens vocab. */
function DomainBadge({ domain }: { domain: DomainOverview }): ReactElement {
  const { fill } = paletteFor(domain.color);
  const Icon = iconFor(domain.icon);
  const isVocab = domain.id === LANGUAGE_DOMAIN_ID;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.7rem] font-extrabold"
      style={{ backgroundColor: `${fill}1a`, color: fill }}
    >
      <Icon aria-hidden="true" className="size-3.5" strokeWidth={2.6} />
      <span className="max-w-[11rem] truncate">{domain.name}</span>
      {isVocab && (
        <span aria-label="sens testé anglais vers français" className="opacity-80">
          · EN&nbsp;→&nbsp;FR
        </span>
      )}
    </span>
  );
}

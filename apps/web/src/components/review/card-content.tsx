import type { ReactElement, ReactNode } from 'react';

import { fillCloze, parseCloze } from '@/lib/cloze';
import type { DueCard } from '@/lib/api/types';

/**
 * Rendu du contenu d'une carte, cloze compris.
 *
 * La syntaxe brute `{{c1::...}}` n'est jamais affichée : au recto, chaque trou
 * devient un blanc (pastille) ; au verso, la réponse apparaît en vert et gras.
 */

/** Recto : la question, trous masqués. */
export function CardFront({ card }: { card: DueCard }): ReactElement {
  if (card.item.type !== 'cloze') {
    return <CardText>{card.item.front}</CardText>;
  }

  const segments = parseCloze(card.item.front);

  return (
    <CardText ariaLabel={ariaFront(card.item.front)}>
      {segments.map((segment, index) =>
        segment.kind === 'text' ? (
          <span key={index}>{segment.value}</span>
        ) : (
          <ClozeBlank key={index} hint={segment.hint} />
        ),
      )}
    </CardText>
  );
}

/** Verso : la réponse. Pour un cloze, la phrase complète avec le trou rempli. */
export function CardBack({ card }: { card: DueCard }): ReactElement {
  if (card.item.type !== 'cloze') {
    return <CardText>{card.item.back}</CardText>;
  }

  const segments = parseCloze(card.item.front);

  return (
    <CardText ariaLabel={fillCloze(card.item.front)}>
      {segments.map((segment, index) =>
        segment.kind === 'text' ? (
          <span key={index}>{segment.value}</span>
        ) : (
          <ClozeAnswer key={index}>{segment.answer}</ClozeAnswer>
        ),
      )}
    </CardText>
  );
}

/** Enveloppe typographique commune aux deux faces. */
function CardText({
  children,
  ariaLabel,
}: {
  children: ReactNode;
  ariaLabel?: string;
}): ReactElement {
  return (
    <p
      aria-label={ariaLabel}
      className="text-balance text-center text-2xl font-extrabold leading-snug sm:text-3xl md:text-4xl"
    >
      {children}
    </p>
  );
}

/** Le blanc affiché au recto, avec son indice éventuel. */
function ClozeBlank({ hint }: { hint: string | null }): ReactElement {
  return (
    <span className="mx-1 inline-flex min-w-[3.5rem] items-center justify-center rounded-lg border-2 border-dashed border-macaw/60 bg-macaw/10 px-2 py-0.5 align-middle text-macaw">
      {hint ?? '·····'}
    </span>
  );
}

/** La réponse mise en valeur au verso. */
function ClozeAnswer({ children }: { children: ReactNode }): ReactElement {
  return <span className="font-black text-feather-green">{children}</span>;
}

/** Question complète en clair, pour les lecteurs d'écran (recto cloze). */
function ariaFront(front: string): string {
  return parseCloze(front)
    .map((segment) => (segment.kind === 'text' ? segment.value : 'blanc à compléter'))
    .join('');
}

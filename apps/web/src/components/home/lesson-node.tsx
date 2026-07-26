'use client';

import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import type { CSSProperties, ReactElement } from 'react';

import type { LessonNodeState, PathLessonNode } from '@/lib/api/path-types';

/**
 * Un nœud du chemin : leçon terminée (coche), disponible (pulsation + badge
 * « COMMENCER ») ou verrouillée (cadenas gris).
 *
 * Terminée / disponible = lien vers /lesson/[id]. Verrouillée = bouton
 * désactivé. L'état est annoncé aux lecteurs d'écran via l'`aria-label`.
 *
 * Couleur des nœuds = **orange de marque** (progression cohérente dans toute
 * l'app), indépendante du domaine ; le blanc de l'icône reste AA sur l'orange.
 */
export function LessonNode({ node }: { node: PathLessonNode }): ReactElement {
  const reduceMotion = useReducedMotion();
  const fill = 'var(--color-primary)';
  const shadow = 'var(--color-primary-shadow)';

  const label = `Leçon ${node.title} — ${STATE_LABEL[node.state]}`;

  // Nœud verrouillé : non cliquable.
  if (node.state === 'locked') {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <span
          role="img"
          aria-label={label}
          className="grid size-16 place-items-center rounded-full border-2 border-border bg-surface-hover text-muted-foreground shadow-[0_4px_0_var(--color-border)]"
        >
          <LockIcon />
        </span>
        <NodeCaption title={node.title} muted />
      </div>
    );
  }

  const style = { '--node-fill': fill, '--node-shadow': shadow } as CSSProperties;

  return (
    <div className="relative flex flex-col items-center gap-1.5">
      {/* Anneau de pulsation pour la leçon disponible. */}
      {node.state === 'available' && !reduceMotion && (
        <motion.span
          aria-hidden="true"
          className="absolute top-0 size-16 rounded-full"
          style={{ backgroundColor: fill }}
          initial={{ opacity: 0.5, scale: 1 }}
          animate={{ opacity: 0, scale: 1.5 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
        />
      )}

      {node.state === 'available' && (
        <span
          aria-hidden="true"
          className="absolute -top-7 whitespace-nowrap rounded-full border-2 border-border bg-surface px-2.5 py-0.5 text-[0.65rem] font-black uppercase tracking-wide text-foreground shadow-sm"
        >
          Commencer
        </span>
      )}

      <Link
        href={`/lesson/${node.id}`}
        aria-label={node.state === 'available' ? `${label}, commencer` : label}
        aria-current={node.state === 'available' ? 'step' : undefined}
        style={style}
        className="relative grid size-16 place-items-center rounded-full text-white shadow-[0_5px_0_var(--node-shadow)] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-[3px] active:shadow-[0_2px_0_var(--node-shadow)] motion-reduce:active:translate-y-0"
      >
        <span className="absolute inset-0 rounded-full" style={{ backgroundColor: fill }} />
        <span className="relative">{node.state === 'completed' ? <CheckIcon /> : <StarIcon />}</span>
      </Link>

      <NodeCaption title={node.title} />
    </div>
  );
}

const STATE_LABEL: Record<LessonNodeState, string> = {
  completed: 'terminée',
  available: 'disponible',
  locked: 'verrouillée',
};

function NodeCaption({ title, muted = false }: { title: string; muted?: boolean }): ReactElement {
  return (
    <span
      aria-hidden="true"
      className={`max-w-[7rem] text-center text-xs font-extrabold leading-tight ${
        muted ? 'text-muted-foreground' : 'text-foreground'
      }`}
    >
      {title}
    </span>
  );
}

function CheckIcon(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" className="size-7" fill="none" aria-hidden="true">
      <path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarIcon(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" className="size-7" fill="currentColor" aria-hidden="true">
      <path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.4l-5.8 3.05 1.1-6.47L2.6 9.35l6.5-.95L12 2.5z" />
    </svg>
  );
}

function LockIcon(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

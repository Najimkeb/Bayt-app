import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes, CSSProperties, ForwardedRef, ReactElement } from 'react';
import { forwardRef } from 'react';

import { cn } from '../lib/cn.js';

/**
 * Bouton "pressable" BAYT — signature Duolingo.
 *
 * Couleur pleine, liseré bas plus foncé (relief 3D), qui s'enfonce au clic. Le
 * mecanisme visuel vit dans la classe `.pressable` (globals.css) ; ici on ne
 * fait que poser les couleurs de chaque variante via des variables CSS.
 *
 * Accessibilite : texte gras et grande cible tactile (>= 44 px, WCAG 2.2 —
 * 2.5.8), anneau de focus visible au clavier.
 */
export const buttonVariants = cva(
  cn(
    'pressable inline-flex select-none items-center justify-center gap-2 rounded-[var(--radius-button)]',
    'font-extrabold uppercase tracking-wide',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'focus-visible:ring-offset-background',
    'disabled:pointer-events-none',
  ),
  {
    variants: {
      variant: {
        green: '[--btn-bg:var(--color-feather-green)] [--btn-shadow:var(--color-feather-green-shadow)] [--btn-fg:#fff]',
        red: '[--btn-bg:var(--color-cardinal)] [--btn-shadow:var(--color-cardinal-shadow)] [--btn-fg:#fff]',
        blue: '[--btn-bg:var(--color-macaw)] [--btn-shadow:var(--color-macaw-shadow)] [--btn-fg:#fff]',
        yellow: '[--btn-bg:var(--color-bee)] [--btn-shadow:var(--color-bee-shadow)] [--btn-fg:#4b4b4b]',
        gray: '[--btn-bg:var(--color-surface)] [--btn-shadow:var(--color-border-strong)] [--btn-fg:var(--color-foreground)] border-2 border-border',
      },
      size: {
        sm: 'h-10 px-4 text-sm',
        md: 'h-[50px] px-6 text-base',
        lg: 'h-14 px-8 text-lg',
      },
    },
    defaultVariants: {
      variant: 'green',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef(function Button(
  { className, variant, size, type = 'button', style, ...props }: ButtonProps,
  ref: ForwardedRef<HTMLButtonElement>,
): ReactElement {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      style={style as CSSProperties}
      {...props}
    />
  );
});

import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes, ForwardedRef, ReactElement } from 'react';
import { forwardRef } from 'react';

import { cn } from '../lib/cn.js';

/**
 * Bouton de base BAYT.
 *
 * Accessibilite : anneau de focus toujours visible au clavier (`focus-visible`),
 * cible tactile d'au moins 44 px de haut sur les tailles `md` et `lg`
 * (WCAG 2.2 — 2.5.8 Target Size).
 */
export const buttonVariants = cva(
  cn(
    'inline-flex items-center justify-center gap-2 rounded-2xl font-medium',
    'transition-[transform,background-color,box-shadow,color] duration-200 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-[0.98] motion-reduce:active:scale-100 motion-reduce:transition-none',
  ),
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover',
        secondary: 'bg-surface text-foreground border border-border hover:bg-surface-hover',
        ghost: 'text-muted-foreground hover:bg-surface-hover hover:text-foreground',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-5 text-sm',
        lg: 'h-13 px-7 text-base',
        icon: 'size-11',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef(function Button(
  { className, variant, size, type = 'button', ...props }: ButtonProps,
  ref: ForwardedRef<HTMLButtonElement>,
): ReactElement {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
});

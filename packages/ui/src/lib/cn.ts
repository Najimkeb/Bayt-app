import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Compose des classes Tailwind en resolvant les conflits.
 *
 * Permet a un composant d'exposer une prop `className` qui surcharge
 * reellement ses styles par defaut (`p-4` + `p-8` => `p-8`).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

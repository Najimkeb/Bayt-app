/**
 * `@bayt/ui` — bibliotheque de composants partagee (shadcn/ui + Tailwind).
 *
 * N'y vit que ce qui est reellement partageable et sans etat. Les composants
 * porteurs d'une intention produit (carte de revision, mascotte) restent dans
 * l'application qui les utilise, tant qu'un second usage ne les justifie pas.
 */

export { Button, buttonVariants, type ButtonProps } from './components/button.js';
export { Surface } from './components/surface.js';
export { cn } from './lib/cn.js';

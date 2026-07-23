/**
 * `@bayt/domain` — coeur metier de BAYT, volontairement pur.
 *
 * Aucune dependance Cloudflare, Next ou reseau ne doit entrer ici : le domaine
 * doit rester testable en isolation (cf. lessons.md L003). Les Workers et l'UI
 * se contentent d'orchestrer ce que ce paquet expose.
 *
 * `ts-fsrs` est utilise comme moteur de calcul FSRS-6, mais encapsule derriere
 * nos propres types : aucun type de la librairie ne traverse cette frontiere
 * (cf. lessons.md L007).
 */

export * from './scheduling/index.js';
export * from './exercises/index.js';

/** Version du contrat de domaine, utile pour tracer les `ReviewLog` produits. */
export const DOMAIN_VERSION = '0.1.0';

/**
 * `@bayt/domain` — coeur metier de BAYT, volontairement pur.
 *
 * Aucune dependance Cloudflare, Next ou reseau ne doit entrer ici : le domaine
 * doit rester testable en isolation (cf. lessons.md L003). Les Workers et l'UI
 * se contentent d'orchestrer ce que ce paquet expose.
 *
 * Prochain habitant de ce module : le moteur FSRS
 * `(SchedulingState, grade, now) -> nouvel SchedulingState`.
 */

/** Version du contrat de domaine, utile pour tracer les `ReviewLog` produits. */
export const DOMAIN_VERSION = '0.1.0';

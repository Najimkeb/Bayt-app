/**
 * Domaines **sensibles** (droit, santé, finance) : un avertissement permanent
 * invite à vérifier auprès de la source officielle avant de mémoriser.
 *
 * Pour ces domaines, on peut aussi basculer la génération sur un modèle plus
 * rigoureux **sans refonte** : `WebSearchProvider`/`LLMProvider` sont
 * interchangeables — il suffit d'injecter un provider Claude (ex. modèle Opus)
 * pour le domaine concerné dans la fabrique du Worker.
 */
const SENSITIVE_DOMAIN_IDS = new Set(['dom_rgpd', 'dom_economie', 'dom_business']);

/** Ce domaine relève-t-il d'un sujet sensible ? */
export function isSensitiveDomain(domainId: string): boolean {
  return SENSITIVE_DOMAIN_IDS.has(domainId);
}

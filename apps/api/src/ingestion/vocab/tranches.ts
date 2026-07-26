/**
 * Tranches de fréquence du vocabulaire anglais.
 *
 * On apprend les mots par **ordre d'utilité** : les tranches suivent le rang de
 * fréquence d'usage en anglais courant (corpus type COCA / SUBTLEX). Chaque
 * tranche couvre un intervalle de rangs ; la génération vise les mots les PLUS
 * fréquents de l'intervalle, par paquets, jamais en un seul appel géant.
 */

/** Niveaux de brouillon (réutilise l'enum existant des `lesson_drafts`). */
export type DraftLevel = 'beginner' | 'intermediate' | 'advanced';

/** Une tranche de fréquence : bornes de rang + libellé + niveau associé. */
export interface FrequencyTranche {
  /** Identifiant stable (aussi la valeur du `<select>`). */
  readonly id: string;
  /** Rang de début (inclus, 1-based). */
  readonly start: number;
  /** Rang de fin (inclus). */
  readonly end: number;
  /** Libellé humain (studio + titre du brouillon). */
  readonly label: string;
  /** Niveau pédagogique indicatif de la tranche. */
  readonly level: DraftLevel;
}

/** Les 4 tranches proposées, du plus utile au plus avancé. */
export const FREQUENCY_TRANCHES: readonly FrequencyTranche[] = [
  { id: '1-100', start: 1, end: 100, label: 'Les 100 mots les plus fréquents', level: 'beginner' },
  { id: '100-300', start: 100, end: 300, label: 'Mots 100 à 300', level: 'beginner' },
  { id: '300-600', start: 300, end: 600, label: 'Mots 300 à 600', level: 'intermediate' },
  { id: '600-1000', start: 600, end: 1000, label: 'Mots 600 à 1000', level: 'advanced' },
];

/** Retrouve une tranche par son id, ou `null`. */
export function findTranche(id: string): FrequencyTranche | null {
  return FREQUENCY_TRANCHES.find((t) => t.id === id) ?? null;
}

/** Nombre de mots visés par une tranche (taille de l'intervalle de rangs). */
export function trancheSize(tranche: FrequencyTranche): number {
  return tranche.end - tranche.start + 1;
}

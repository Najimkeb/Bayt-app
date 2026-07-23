import type { ReviewGrade } from '../scheduling/types.js';

/**
 * Traduction d'un résultat d'exercice en note FSRS.
 *
 * C'est le pont entre la couche « leçon » et le moteur de mémorisation : chaque
 * réponse devient une note, et rien d'autre ne pilote la mémoire.
 *
 * Règle (assumée, cf. lessons.md) :
 * - faux → `Again` ;
 * - juste après un essai raté ou un indice → `Hard` ;
 * - juste du premier coup, sans aide → `Good`.
 *
 * Volontairement **pas** de `Easy` : un exercice réussi n'est jamais « trivial »
 * au point de mériter le plus long intervalle — on laisse ce jugement à la
 * révision libre de flashcards.
 */
export interface ExerciseOutcome {
  readonly correct: boolean;
  /** Un essai raté précédent ou un indice a précédé cette réponse. */
  readonly assisted: boolean;
}

export function gradeForOutcome({ correct, assisted }: ExerciseOutcome): ReviewGrade {
  if (!correct) {
    return 'Again';
  }

  return assisted ? 'Hard' : 'Good';
}

import type { MascotMood } from '@bayt/ui';

import type { ReviewGrade } from '@/lib/api/types';

/**
 * Ce que dit la mascotte, selon le moment de la session.
 *
 * Le ton est celui d'un mentor : on commente ce que la mémoire est en train de
 * faire, on ne félicite jamais d'avoir cliqué. Aucun diminutif, aucune
 * exclamation gratuite — bienveillant, jamais infantilisant.
 */
export function mascotMessage(
  mood: MascotMood,
  options: { readonly revealed?: boolean; readonly grade?: ReviewGrade | null } = {},
): string {
  const { revealed = false, grade = null } = options;

  switch (mood) {
    case 'happy':
      return grade === 'Easy'
        ? 'Solide. Cette carte reviendra bien plus tard, ta mémoire tient.'
        : 'Bien rappelé. On espace l\'intervalle en conséquence.';

    case 'encouraging':
      return grade === 'Again'
        ? 'Oublier fait partie du processus. On la revoit très vite, c\'est là que ça s\'ancre.'
        : 'Rappel laborieux, donc utile. On resserre un peu l\'intervalle.';

    case 'celebrating':
      return 'Ta file est vide. La mémoire travaille maintenant en arrière-plan.';

    case 'idle':
    default:
      return revealed
        ? 'Compare ta réponse à la solution, puis note honnêtement ton rappel.'
        : 'Prends le temps de retrouver la réponse avant de la révéler.';
  }
}

/** Traduit une note en humeur de la mascotte. */
export function moodForGrade(grade: ReviewGrade): MascotMood {
  return grade === 'Good' || grade === 'Easy' ? 'happy' : 'encouraging';
}

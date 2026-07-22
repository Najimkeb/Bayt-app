import type { MascotMood } from '@bayt/ui';

import type { ReviewGrade } from '@/lib/api/types';

/**
 * Ce que dit la mascotte, selon le moment de la session.
 *
 * Le ton est celui d'un mentor : on commente ce que la memoire est en train de
 * faire, on ne felicite jamais d'avoir clique. Aucun diminutif, aucune
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
        ? 'Solide. Cette carte reviendra bien plus tard, ta memoire tient.'
        : 'Bien rappele. On espace l\'intervalle en consequence.';

    case 'encouraging':
      return grade === 'Again'
        ? 'Oublier fait partie du processus. On la revoit tres vite, c\'est la que ca s\'ancre.'
        : 'Rappel laborieux, donc utile. On resserre un peu l\'intervalle.';

    case 'celebrating':
      return 'Ta file est vide. La memoire travaille maintenant en arriere-plan.';

    case 'idle':
    default:
      return revealed
        ? 'Compare ta reponse a la solution, puis note honnetement ton rappel.'
        : 'Prends le temps de retrouver la reponse avant de la reveler.';
  }
}

/** Traduit une note en humeur de la mascotte. */
export function moodForGrade(grade: ReviewGrade): MascotMood {
  return grade === 'Good' || grade === 'Easy' ? 'happy' : 'encouraging';
}

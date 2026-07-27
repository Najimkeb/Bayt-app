import type { ReactElement } from 'react';

import { QuizScreen } from '@/components/quiz/quiz-screen';

/**
 * Section « Quiz » — test ludique et rapide, distinct de la révision espacée.
 * Toute l'interaction (config, jeu, résultat) vit dans `QuizScreen`, côté client.
 */
export default function QuizPage(): ReactElement {
  return <QuizScreen />;
}

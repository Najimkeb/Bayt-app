import type { ReactElement } from 'react';

import { LessonSession } from '@/components/lesson/lesson-session';

/**
 * Écran d'une leçon — la séquence d'exercices jouable.
 *
 * Page serveur minimale : toute l'interaction (file, feedback, clavier) vit dans
 * `LessonSession`, côté client.
 */
export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<ReactElement> {
  const { id } = await params;

  return <LessonSession lessonId={id} />;
}

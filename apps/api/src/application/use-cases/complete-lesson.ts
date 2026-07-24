import type { PathRepository } from '../ports/path-repository.js';

/**
 * Cas d'usage « je viens de terminer une leçon ».
 *
 * Persiste la complétion (ce qui débloque la suivante). Le chemin étant désormais
 * scoping par domaine, le rafraîchissement est laissé à l'appelant (l'UI réinvalide
 * le chemin du domaine courant).
 */
export class CompleteLesson {
  public constructor(private readonly repository: PathRepository) {}

  public async execute(userId: string, lessonId: string, now: Date): Promise<void> {
    await this.repository.markLessonCompleted(userId, lessonId, now);
  }
}

import type { PathRepository } from '../ports/path-repository.js';
import { GetPath, type LearningPath } from './get-path.js';

/**
 * Cas d'usage « je viens de terminer une leçon ».
 *
 * Persiste la complétion (ce qui débloque la suivante) et renvoie le chemin à
 * jour, prêt à rafraîchir l'accueil.
 */
export class CompleteLesson {
  public constructor(private readonly repository: PathRepository) {}

  public async execute(userId: string, lessonId: string, now: Date): Promise<LearningPath> {
    await this.repository.markLessonCompleted(userId, lessonId, now);

    return new GetPath(this.repository).execute(userId);
  }
}

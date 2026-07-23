import type { Lesson } from '@bayt/domain';

import { LessonNotFoundError } from '../errors.js';
import type { LessonRepository } from '../ports/lesson-repository.js';

/**
 * Cas d'usage « donne-moi la leçon à jouer ».
 *
 * Renvoie la leçon complète (solutions comprises) — c'est le présentateur HTTP
 * qui retire les solutions avant de les envoyer au client.
 */
export class GetLesson {
  public constructor(private readonly repository: LessonRepository) {}

  public async execute(lessonId: string): Promise<Lesson> {
    const lesson = await this.repository.findLesson(lessonId);

    if (lesson === null) {
      throw new LessonNotFoundError(lessonId);
    }

    return lesson;
  }
}

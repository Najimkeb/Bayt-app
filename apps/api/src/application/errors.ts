/** Erreurs metier de la couche application, traduites en HTTP par les routes. */

/** Item inconnu — l'apprenant a demande une carte qui n'existe pas. */
export class ItemNotFoundError extends Error {
  public override readonly name = 'ItemNotFoundError';

  public constructor(public readonly itemId: string) {
    super(`Item introuvable : ${itemId}`);
  }
}

/** Leçon inconnue. */
export class LessonNotFoundError extends Error {
  public override readonly name = 'LessonNotFoundError';

  public constructor(public readonly lessonId: string) {
    super(`Leçon introuvable : ${lessonId}`);
  }
}

/** Exercice inconnu (ou n'appartenant pas à la leçon indiquée). */
export class ExerciseNotFoundError extends Error {
  public override readonly name = 'ExerciseNotFoundError';

  public constructor(public readonly exerciseId: string) {
    super(`Exercice introuvable : ${exerciseId}`);
  }
}

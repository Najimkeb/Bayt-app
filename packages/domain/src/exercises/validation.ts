import type {
  Exercise,
  ExerciseAnswer,
  MatchingExercise,
  MatchingSide,
} from './types.js';

/**
 * Correction déterministe des exercices — cœur métier, pur et testable.
 *
 * Aucune IA : chaque type a une règle de comparaison explicite.
 */

/** Résultat d'une correction. */
export interface ExerciseCheck {
  readonly correct: boolean;
}

/**
 * Normalise un texte libre pour une comparaison tolérante :
 * minuscules, accents retirés, ponctuation ignorée, espaces compactés.
 */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // diacritiques combinants
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ') // ponctuation -> espace
    .replace(/\s+/g, ' ')
    .trim();
}

/** Corrige une réponse, quel que soit le type d'exercice. */
export function checkAnswer(exercise: Exercise, answer: ExerciseAnswer): ExerciseCheck {
  switch (exercise.type) {
    case 'mcq':
      return { correct: answer.kind === 'mcq' && answer.choice === exercise.answerIndex };

    case 'fill_blank': {
      if (answer.kind !== 'fill_blank') {
        return { correct: false };
      }

      const candidate = normalizeText(answer.text);
      const accepted = [exercise.answer, ...(exercise.accept ?? [])].map(normalizeText);

      return { correct: candidate.length > 0 && accepted.includes(candidate) };
    }

    case 'matching':
      return { correct: answer.kind === 'matching' && matchesPairs(exercise, answer.pairs) };
  }
}

/** Côtés « gauche » d'une association, dans l'ordre, avec identifiants stables. */
export function matchingLefts(exercise: MatchingExercise): readonly MatchingSide[] {
  return exercise.pairs.map((pair, index) => ({ id: `L${String(index)}`, text: pair.left }));
}

/** Côtés « droit » d'une association, dans l'ordre, avec identifiants stables. */
export function matchingRights(exercise: MatchingExercise): readonly MatchingSide[] {
  return exercise.pairs.map((pair, index) => ({ id: `R${String(index)}`, text: pair.right }));
}

/** Index encodé dans un identifiant `L<n>` / `R<n>`, ou `null` si invalide. */
function sideIndex(id: string, prefix: 'L' | 'R'): number | null {
  const match = new RegExp(`^${prefix}(\\d+)$`).exec(id);

  return match === null ? null : Number.parseInt(match[1] ?? '', 10);
}

/**
 * Une association est correcte si chaque gauche est apparié à son droit
 * d'origine, exactement une fois, sans oubli ni doublon.
 */
function matchesPairs(
  exercise: MatchingExercise,
  answer: readonly { readonly leftId: string; readonly rightId: string }[],
): boolean {
  const expected = exercise.pairs.length;

  if (answer.length !== expected) {
    return false;
  }

  const seenLeft = new Set<number>();

  for (const { leftId, rightId } of answer) {
    const left = sideIndex(leftId, 'L');
    const right = sideIndex(rightId, 'R');

    if (left === null || right === null || left !== right) {
      return false;
    }

    if (left < 0 || left >= expected || seenLeft.has(left)) {
      return false;
    }

    seenLeft.add(left);
  }

  return seenLeft.size === expected;
}

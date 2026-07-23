import type { Exercise } from '@bayt/domain';

import type { exercises } from './schema.js';

type ExerciseRow = typeof exercises.$inferSelect;

/**
 * Conversion entre une ligne `exercises` (type + prompt + payload JSON) et
 * l'`Exercise` du domaine.
 *
 * Le `payload` porte le contenu propre au type, solution comprise. Le mapper est
 * la seule frontière qui connaît sa forme sérialisée.
 */

interface McqPayload {
  readonly options: string[];
  readonly answerIndex: number;
}
interface FillBlankPayload {
  readonly answer: string;
  readonly accept?: string[];
}
interface MatchingPayload {
  readonly pairs: { left: string; right: string }[];
}

/** Ligne D1 → exercice du domaine. */
export function toExercise(row: ExerciseRow): Exercise {
  const base = { id: row.id, itemId: row.itemId, prompt: row.prompt } as const;
  const payload: unknown = JSON.parse(row.payload);

  switch (row.type) {
    case 'mcq': {
      const { options, answerIndex } = payload as McqPayload;

      return { ...base, type: 'mcq', options, answerIndex };
    }
    case 'fill_blank': {
      const { answer, accept } = payload as FillBlankPayload;

      return { ...base, type: 'fill_blank', answer, ...(accept ? { accept } : {}) };
    }
    case 'matching': {
      const { pairs } = payload as MatchingPayload;

      return { ...base, type: 'matching', pairs };
    }
  }
}

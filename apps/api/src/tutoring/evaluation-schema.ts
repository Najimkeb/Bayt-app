import { z } from 'zod';

import { extractJson } from '../ingestion/card-schema.js';

/**
 * Contrat de sortie de l'évaluateur « Explique à BAYT ».
 *
 * BAYT évalue la compréhension d'une explication. Sortie **strictement** validée
 * (JSON Mode + zod). Les textes sont rédigés à la première personne (voix de
 * BAYT) et présentés tels quels à l'apprenant.
 */
export const evaluationSchema = z.object({
  /** Score de compréhension, 0 à 100. */
  score: z.number().int().min(0).max(100),
  /** Jugement global. */
  verdict: z.enum(['correct', 'incomplete', 'imprecise', 'erroneous']),
  /** Ce qui est bien compris (renforcement honnête). */
  strengths: z.array(z.string().trim().min(1).max(400)).max(6),
  /** Lacunes et imprécisions. */
  gaps: z.array(z.string().trim().min(1).max(400)).max(6),
  /** Corrections d'erreurs factuelles (peuvent porter « à vérifier »). */
  corrections: z.array(z.string().trim().min(1).max(500)).max(6),
  /** 1 à 2 questions de relance sur les points faibles. */
  followUps: z.array(z.string().trim().min(1).max(400)).min(0).max(3),
  /** Reformulation claire du concept par BAYT. */
  reformulation: z.string().trim().min(1).max(1500),
});

export type Evaluation = z.infer<typeof evaluationSchema>;

/** JSON Schema (JSON Mode) — miroir ; la validation zod reste juge. */
export const EVALUATION_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    score: { type: 'integer' },
    verdict: { type: 'string', enum: ['correct', 'incomplete', 'imprecise', 'erroneous'] },
    strengths: { type: 'array', items: { type: 'string' } },
    gaps: { type: 'array', items: { type: 'string' } },
    corrections: { type: 'array', items: { type: 'string' } },
    followUps: { type: 'array', items: { type: 'string' } },
    reformulation: { type: 'string' },
  },
  required: ['score', 'verdict', 'strengths', 'gaps', 'corrections', 'followUps', 'reformulation'],
};

/** Erreur : la sortie n'est pas une évaluation valide. */
export class EvaluationParseError extends Error {
  public override readonly name = 'EvaluationParseError';
}

/** Analyse et valide la sortie du modèle. */
export function parseEvaluation(raw: string): Evaluation {
  let json: unknown;
  try {
    json = JSON.parse(extractJson(raw));
  } catch {
    throw new EvaluationParseError('JSON illisible');
  }

  const result = evaluationSchema.safeParse(json);
  if (!result.success) {
    throw new EvaluationParseError('Structure d’évaluation invalide');
  }

  return result.data;
}

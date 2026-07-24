import { REVIEW_GRADES } from '@bayt/domain';
import { z } from 'zod';

/**
 * Validation des entrees HTTP.
 *
 * Aucune donnee non validee n'atteint la couche application : les cas d'usage
 * peuvent supposer leurs invariants acquis.
 *
 * **L'`userId` ne figure plus dans aucune entrée** : il provient exclusivement
 * de la session authentifiée (cf. `SessionVerifier` + middleware). Le client ne
 * peut plus désigner un autre apprenant que lui-même.
 */

/** Nombre maximum de cartes servies en une session de revision. */
const MAX_QUEUE_LIMIT = 100;

/** Identifiant de domaine (catalogue). */
const domainId = z.string().min(1).max(128);

export const dueQueueQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_QUEUE_LIMIT).optional(),
  /** Filtre la file sur un domaine ; absent = tous domaines confondus. */
  domainId: domainId.optional(),
});

/** Chemin d'un domaine précis. */
export const pathQuerySchema = z.object({ domainId });

export const previewQuerySchema = z.object({
  itemId: z.string().min(1).max(128),
});

export const submitReviewBodySchema = z.object({
  itemId: z.string().min(1).max(128),
  grade: z.enum(REVIEW_GRADES),
  /** Instant de la revision ; par defaut, l'horloge du serveur. */
  reviewedAt: z.iso.datetime().optional(),
});

/**
 * Réponse d'exercice, discriminée par `kind` (aligné sur `ExerciseAnswer` du
 * domaine). Bornée pour rester raisonnable.
 */
const exerciseAnswerSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('mcq'), choice: z.number().int().min(0).max(50) }),
  z.object({ kind: z.literal('fill_blank'), text: z.string().max(500) }),
  z.object({
    kind: z.literal('matching'),
    pairs: z
      .array(z.object({ leftId: z.string().max(16), rightId: z.string().max(16) }))
      .max(50),
  }),
]);

export const submitAnswerBodySchema = z.object({
  exerciseId: z.string().min(1).max(128),
  answer: exerciseAnswerSchema,
  /** Un essai raté ou un indice a précédé cette réponse. */
  assisted: z.boolean().optional(),
  reviewedAt: z.iso.datetime().optional(),
});

/** Fuseau horaire IANA de l'apprenant (défaut UTC si absent). */
const timezone = z.string().min(1).max(64).default('UTC');

export const progressQuerySchema = z.object({
  timezone,
});

/** Événement porteur d'XP, discriminé par `type` (aligné sur `XpEvent`). */
const xpEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('review'), grade: z.enum(REVIEW_GRADES) }),
  z.object({ type: z.literal('exercise'), correct: z.boolean() }),
]);

export const incrementProgressBodySchema = z.object({
  event: xpEventSchema,
  timezone,
  /** Instant du gain ; par défaut, l'horloge du serveur. */
  at: z.iso.datetime().optional(),
});

export type DueQueueQuery = z.infer<typeof dueQueueQuerySchema>;
export type SubmitReviewBody = z.infer<typeof submitReviewBodySchema>;
export type SubmitAnswerBody = z.infer<typeof submitAnswerBodySchema>;
export type IncrementProgressBody = z.infer<typeof incrementProgressBodySchema>;

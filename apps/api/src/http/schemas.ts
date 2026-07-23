import { REVIEW_GRADES } from '@bayt/domain';
import { z } from 'zod';

/**
 * Validation des entrees HTTP.
 *
 * Aucune donnee non validee n'atteint la couche application : les cas d'usage
 * peuvent supposer leurs invariants acquis.
 */

/**
 * Identifiant d'apprenant.
 *
 * Provisoirement passe en parametre : il viendra de la session une fois le
 * contexte « Identity & Access » en place (cf. docs/bayt-fondations.md §2.5).
 */
const userId = z.string().min(1).max(128);

/** Nombre maximum de cartes servies en une session de revision. */
const MAX_QUEUE_LIMIT = 100;

export const dueQueueQuerySchema = z.object({
  userId,
  limit: z.coerce.number().int().min(1).max(MAX_QUEUE_LIMIT).optional(),
});

export const previewQuerySchema = z.object({
  userId,
  itemId: z.string().min(1).max(128),
});

export const submitReviewBodySchema = z.object({
  userId,
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
  userId,
  exerciseId: z.string().min(1).max(128),
  answer: exerciseAnswerSchema,
  /** Un essai raté ou un indice a précédé cette réponse. */
  assisted: z.boolean().optional(),
  reviewedAt: z.iso.datetime().optional(),
});

/** Fuseau horaire IANA de l'apprenant (défaut UTC si absent). */
const timezone = z.string().min(1).max(64).default('UTC');

export const progressQuerySchema = z.object({
  userId,
  timezone,
});

/** Événement porteur d'XP, discriminé par `type` (aligné sur `XpEvent`). */
const xpEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('review'), grade: z.enum(REVIEW_GRADES) }),
  z.object({ type: z.literal('exercise'), correct: z.boolean() }),
]);

export const incrementProgressBodySchema = z.object({
  userId,
  event: xpEventSchema,
  timezone,
  /** Instant du gain ; par défaut, l'horloge du serveur. */
  at: z.iso.datetime().optional(),
});

export type DueQueueQuery = z.infer<typeof dueQueueQuerySchema>;
export type SubmitReviewBody = z.infer<typeof submitReviewBodySchema>;
export type SubmitAnswerBody = z.infer<typeof submitAnswerBodySchema>;
export type IncrementProgressBody = z.infer<typeof incrementProgressBodySchema>;

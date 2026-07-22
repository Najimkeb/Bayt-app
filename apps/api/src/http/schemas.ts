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

export const submitReviewBodySchema = z.object({
  userId,
  itemId: z.string().min(1).max(128),
  grade: z.enum(REVIEW_GRADES),
  /** Instant de la revision ; par defaut, l'horloge du serveur. */
  reviewedAt: z.iso.datetime().optional(),
});

export type DueQueueQuery = z.infer<typeof dueQueueQuerySchema>;
export type SubmitReviewBody = z.infer<typeof submitReviewBodySchema>;

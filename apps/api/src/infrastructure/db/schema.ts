import { index, integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { LEARNING_STATES, REVIEW_GRADES } from '@bayt/domain';

/**
 * Schema D1 du contexte « Learning Engine ».
 *
 * Conventions :
 * - toutes les dates sont des **entiers epoch en millisecondes** (UTC, pas de
 *   fuseau, comparables directement dans un index) ;
 * - les valeurs du domaine (`state`, `grade`) sont stockees telles quelles :
 *   les enums viennent de `@bayt/domain`, jamais redefinies ici.
 */

/** L'atome revisable, independant de tout apprenant. */
export const learningItems = sqliteTable('learning_items', {
  id: text('id').primaryKey(),
  type: text('type', { enum: ['flashcard', 'cloze', 'practice_case'] }).notNull(),
  front: text('front').notNull(),
  back: text('back').notNull(),
  /** D'ou vient l'item : document ingere, creation manuelle... */
  sourceRef: text('source_ref'),
  createdAt: integer('created_at').notNull(),
});

/**
 * Etat memoire FSRS par couple (apprenant, item) — **mutable**.
 *
 * L'absence de ligne signifie « item jamais planifie pour cet apprenant » :
 * l'etat est materialise a la premiere revision.
 */
export const schedulingState = sqliteTable(
  'scheduling_state',
  {
    userId: text('user_id').notNull(),
    itemId: text('item_id')
      .notNull()
      .references(() => learningItems.id),

    /** Trace memoire FSRS. */
    stability: real('stability').notNull(),
    difficulty: real('difficulty').notNull(),

    state: text('state', { enum: LEARNING_STATES }).notNull(),
    due: integer('due').notNull(),
    lastReviewedAt: integer('last_reviewed_at'),
    reps: integer('reps').notNull(),
    lapses: integer('lapses').notNull(),
    learningStep: integer('learning_step').notNull(),

    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.itemId] }),
    /** Index de la file des cartes dues : `WHERE user_id = ? AND due <= ?`. */
    index('scheduling_state_user_due_idx').on(table.userId, table.due),
  ],
);

/**
 * Journal des revisions — **append-only**, jamais mis a jour ni supprime.
 *
 * On stocke la transition complete avant -> apres : c'est la matiere premiere
 * de l'optimisation des parametres FSRS par utilisateur, des analytics et de la
 * gamification. Ces donnees ne sont pas retrofitables (cf. lessons.md L002).
 */
export const reviewLogs = sqliteTable(
  'review_logs',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    itemId: text('item_id')
      .notNull()
      .references(() => learningItems.id),

    grade: text('grade', { enum: REVIEW_GRADES }).notNull(),
    reviewedAt: integer('reviewed_at').notNull(),

    /** Etat avant la revision. */
    beforeState: text('before_state', { enum: LEARNING_STATES }).notNull(),
    beforeStability: real('before_stability').notNull(),
    beforeDifficulty: real('before_difficulty').notNull(),
    beforeDue: integer('before_due').notNull(),
    beforeLastReviewedAt: integer('before_last_reviewed_at'),
    beforeReps: integer('before_reps').notNull(),
    beforeLapses: integer('before_lapses').notNull(),
    beforeLearningStep: integer('before_learning_step').notNull(),

    /** Etat apres la revision. */
    afterState: text('after_state', { enum: LEARNING_STATES }).notNull(),
    afterStability: real('after_stability').notNull(),
    afterDifficulty: real('after_difficulty').notNull(),
    afterDue: integer('after_due').notNull(),
    afterLastReviewedAt: integer('after_last_reviewed_at'),
    afterReps: integer('after_reps').notNull(),
    afterLapses: integer('after_lapses').notNull(),
    afterLearningStep: integer('after_learning_step').notNull(),
  },
  (table) => [
    /** Historique d'un apprenant, du plus recent au plus ancien. */
    index('review_logs_user_reviewed_idx').on(table.userId, table.reviewedAt),
    index('review_logs_item_idx').on(table.itemId),
  ],
);

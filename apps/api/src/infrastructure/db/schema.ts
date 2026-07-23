import { index, integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { EXERCISE_TYPES, LEARNING_STATES, REVIEW_GRADES } from '@bayt/domain';

import { DOCUMENT_FORMATS } from '../../ingestion/format.js';
import { DOCUMENT_STATUSES } from '../../ingestion/document.js';

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

/**
 * Une leçon : une séquence ordonnée d'exercices variés.
 *
 * Contexte « Leçon » — au-dessus de la boucle FSRS, sans progression parallèle :
 * chaque exercice révise un `learning_item` et produit une note de révision.
 */
/**
 * Une unité : un groupe ordonné de leçons, avec un bandeau titre coloré.
 *
 * Contexte « Content Catalog » — structure le chemin de progression de l'accueil.
 */
export const units = sqliteTable('units', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  /** Couleur du bandeau (jeton : `green` | `blue` | `yellow` | `purple`). */
  color: text('color').notNull(),
  /** Rang de l'unité dans le chemin. */
  position: integer('position').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const lessons = sqliteTable('lessons', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  /** Unité d'appartenance (chemin de progression), ou `null` si hors chemin. */
  unitId: text('unit_id').references(() => units.id),
  /** Rang de la leçon dans son unité. */
  position: integer('position').notNull().default(0),
  createdAt: integer('created_at').notNull(),
});

/**
 * Complétion des leçons par apprenant — **append-only** à la première réussite.
 *
 * Une leçon terminée débloque la suivante. L'absence de ligne = leçon non
 * terminée.
 */
export const lessonProgress = sqliteTable(
  'lesson_progress',
  {
    userId: text('user_id').notNull(),
    lessonId: text('lesson_id')
      .notNull()
      .references(() => lessons.id),
    completedAt: integer('completed_at').notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.lessonId] })],
);

/**
 * Un exercice d'une leçon.
 *
 * Le contenu propre à chaque type (options d'un QCM, réponse d'un texte à trous,
 * paires d'une association) est stocké en JSON dans `payload` : les formes
 * diffèrent trop pour des colonnes fixes, et le domaine reste seul juge de leur
 * structure. La solution (bonne option, réponse, paires) vit dans ce payload et
 * n'est **jamais** exposée par l'API de lecture.
 */
export const exercises = sqliteTable(
  'exercises',
  {
    id: text('id').primaryKey(),
    lessonId: text('lesson_id')
      .notNull()
      .references(() => lessons.id),
    itemId: text('item_id')
      .notNull()
      .references(() => learningItems.id),
    /** Rang dans la séquence de la leçon. */
    position: integer('position').notNull(),
    type: text('type', { enum: EXERCISE_TYPES }).notNull(),
    prompt: text('prompt').notNull(),
    /** Contenu spécifique au type (JSON), solution comprise. */
    payload: text('payload').notNull(),
  },
  (table) => [index('exercises_lesson_position_idx').on(table.lessonId, table.position)],
);

/**
 * Progression de gamification par apprenant.
 *
 * Couche de motivation, distincte du moteur de mémoire (elle n'influence jamais
 * FSRS). Les dates sont des chaînes `YYYY-MM-DD` dans le fuseau de l'apprenant.
 */
export const userProgress = sqliteTable('user_progress', {
  userId: text('user_id').primaryKey(),
  xpTotal: integer('xp_total').notNull(),
  xpToday: integer('xp_today').notNull(),
  day: text('day'),
  streak: integer('streak').notNull(),
  longestStreak: integer('longest_streak').notNull(),
  dailyGoal: integer('daily_goal').notNull(),
  lastGoalDay: text('last_goal_day'),
});

/**
 * Documents ingérés (contexte « Knowledge Ingestion ») : métadonnées et statut
 * de traitement. Le fichier brut vit dans R2 (`r2_key`) ; les cartes générées
 * deviennent des `learning_items` (`source_ref = 'doc:<id>'`).
 */
export const documents = sqliteTable(
  'documents',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    filename: text('filename').notNull(),
    contentType: text('content_type'),
    format: text('format', { enum: DOCUMENT_FORMATS }).notNull(),
    r2Key: text('r2_key').notNull(),
    status: text('status', { enum: DOCUMENT_STATUSES }).notNull(),
    error: text('error'),
    cardCount: integer('card_count').notNull().default(0),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [index('documents_user_created_idx').on(table.userId, table.createdAt)],
);

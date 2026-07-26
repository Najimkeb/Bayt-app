import { index, integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { EXERCISE_TYPES, LEARNING_STATES, REVIEW_GRADES } from '@bayt/domain';

import { DOCUMENT_FORMATS } from '../../ingestion/format.js';
import { DOCUMENT_STATUSES } from '../../ingestion/document.js';

// Tables d'authentification (Better Auth) — fusionnées ici pour que drizzle-kit
// les intègre à la même base et aux migrations. Le domaine ne les référence
// jamais ; seul le contexte « Identity & Access » les manipule.
export { account, session, user, verification } from './auth-schema.js';

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
  /** Domaine de rattachement (révision par domaine). `null` = non catégorisé. */
  domainId: text('domain_id'),
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
 * Un **domaine** : racine du catalogue (Domaine → Unité → Leçon).
 *
 * Contexte « Content Catalog ». La couleur d'accent vit ici (plus sur l'unité) ;
 * l'UI colore le chemin d'un domaine avec.
 */
export const domains = sqliteTable('domains', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  /** Nom de l'icône lucide-react (ex. `Brain`), mappé vers un composant côté UI. */
  icon: text('icon').notNull(),
  /** Couleur d'accent (jeton `DomainColor` du domaine). */
  color: text('color').notNull(),
  /** Rang d'affichage dans le sélecteur de domaine. */
  position: integer('position').notNull(),
  createdAt: integer('created_at').notNull(),
});

/**
 * Une unité : un groupe ordonné de leçons, **rattachée à un domaine**.
 *
 * Structure le chemin de progression de l'accueil, pour un domaine donné.
 */
export const units = sqliteTable('units', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  /** Domaine d'appartenance (identifiant d'un `domains.id`). */
  domainId: text('domain_id').notNull(),
  /** Rang de l'unité dans le domaine. */
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
 * de traitement. Le **texte extrait** est stocké ici (`extracted_text`), en
 * attendant l'activation de R2 (cf. lessons.md L031) ; les cartes générées
 * deviennent des `learning_items` (`source_ref = 'doc:<id>'`).
 */
/**
 * Liste blanche d'inscription (contexte « Identity & Access »).
 *
 * BAYT est sur **invitation** : seul un e-mail présent ici peut s'inscrire et se
 * connecter. Retirer une entrée **révoque** l'accès (vérifié aussi à la
 * connexion). L'admin gère cette table depuis le panneau `/admin`.
 */
export const allowedEmails = sqliteTable('allowed_emails', {
  email: text('email').primaryKey(),
  addedAt: integer('added_at').notNull(),
  /** Note libre de l'admin (qui, pourquoi). */
  note: text('note'),
});

/**
 * Jetons de réinitialisation de mot de passe **générés par l'admin**.
 *
 * À usage unique et à durée limitée : `used_at` marque la consommation,
 * `expires_at` la péremption. La vérification (valide, non expiré, non utilisé)
 * est **entièrement côté serveur**. Aucun e-mail n'est envoyé : l'admin
 * transmet le lien manuellement.
 */
export const passwordResetTokens = sqliteTable(
  'password_reset_tokens',
  {
    token: text('token').primaryKey(),
    userId: text('user_id').notNull(),
    expiresAt: integer('expires_at').notNull(),
    usedAt: integer('used_at'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('password_reset_tokens_user_idx').on(table.userId)],
);

export const documents = sqliteTable(
  'documents',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    filename: text('filename').notNull(),
    contentType: text('content_type'),
    format: text('format', { enum: DOCUMENT_FORMATS }).notNull(),
    /** Domaine choisi au dépôt (les cartes générées en héritent). `null` = non catégorisé. */
    domainId: text('domain_id'),
    /** Texte extrait à la réception (source de la génération). `null` si non extrait. */
    extractedText: text('extracted_text'),
    status: text('status', { enum: DOCUMENT_STATUSES }).notNull(),
    error: text('error'),
    cardCount: integer('card_count').notNull().default(0),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [index('documents_user_created_idx').on(table.userId, table.createdAt)],
);

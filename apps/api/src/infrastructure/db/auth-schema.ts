import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Schéma d'authentification (contexte « Identity & Access »).
 *
 * Tables **cœur de Better Auth** (email + mot de passe). Volontairement isolées
 * du schéma métier : Better Auth en est propriétaire, le domaine ne les touche
 * jamais. Elles sont fusionnées au schéma Drizzle via `schema.ts` pour que
 * drizzle-kit génère la migration et que l'adaptateur les retrouve.
 *
 * Conventions :
 * - clés JS en camelCase (Better Auth les lit ainsi), colonnes en snake_case ;
 * - dates en `integer` mode `timestamp` — Better Auth manipule des `Date`,
 *   l'adaptateur Drizzle fait la conversion ;
 * - la table `account` porte le mot de passe haché (méthode e-mail) **et** les
 *   comptes OAuth futurs (`providerId`), sans refonte le jour venu.
 */

/** Un utilisateur authentifié. `id` devient le `userId` de tout le domaine. */
export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull(),
  image: text('image'),
  /**
   * Rôle applicatif : `'user'` (défaut) ou `'admin'`. Détection admin **fiable
   * côté serveur** — jamais une simple liste en configuration. Better Auth
   * ignore cette colonne (défaut SQL à l'insertion) ; c'est le contexte
   * « Identity & Access » qui la lit et la fait évoluer.
   */
  role: text('role').notNull().default('user'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

/** Une session active (cookie signé côté client, ligne côté serveur). */
export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

/**
 * Un moyen de connexion rattaché à un utilisateur.
 *
 * Méthode e-mail : `providerId = 'credential'`, `password` = hachage. Point
 * d'extension OAuth : un provider social ajoute une ligne (`providerId`,
 * `accessToken`…) sans changer le schéma.
 */
export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

/** Jetons de vérification (réinitialisation, e-mail…). Requis par Better Auth. */
export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

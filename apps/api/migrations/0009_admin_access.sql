-- Rôle applicatif (détection admin fiable côté serveur) + seed du fondateur.
ALTER TABLE `user` ADD `role` text DEFAULT 'user' NOT NULL;--> statement-breakpoint
UPDATE `user` SET `role` = 'admin' WHERE `email` = 'najimkeb31@gmail.com';--> statement-breakpoint
-- Liste blanche d'inscription (BAYT sur invitation) + première entrée autorisée.
CREATE TABLE `allowed_emails` (
	`email` text PRIMARY KEY NOT NULL,
	`added_at` integer NOT NULL,
	`note` text
);--> statement-breakpoint
INSERT OR IGNORE INTO `allowed_emails` (`email`, `added_at`, `note`) VALUES ('najimkeb31@gmail.com', 1785000000000, 'Fondateur');--> statement-breakpoint
-- Jetons de réinitialisation générés par l'admin (usage unique, durée limitée).
CREATE TABLE `password_reset_tokens` (
	`token` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer NOT NULL
);--> statement-breakpoint
CREATE INDEX `password_reset_tokens_user_idx` ON `password_reset_tokens` (`user_id`);

-- Historique du mode « Explique à BAYT » : sujet, score, verdict, note FSRS.
CREATE TABLE `explanation_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`item_id` text,
	`topic` text NOT NULL,
	`score` integer NOT NULL,
	`verdict` text NOT NULL,
	`grade` text,
	`created_at` integer NOT NULL
);--> statement-breakpoint
CREATE INDEX `explanation_logs_user_created_idx` ON `explanation_logs` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `explanation_logs_item_idx` ON `explanation_logs` (`item_id`);

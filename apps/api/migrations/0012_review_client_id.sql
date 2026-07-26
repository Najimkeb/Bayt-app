-- Révision hors-ligne : idempotence par id client sur review_logs.
ALTER TABLE `review_logs` ADD `client_id` text;--> statement-breakpoint
-- NULL est distinct en SQLite : les logs en ligne (client_id NULL) coexistent ;
-- deux logs hors-ligne de même id client ne peuvent pas être insérés deux fois.
CREATE UNIQUE INDEX `review_logs_client_id_idx` ON `review_logs` (`client_id`);

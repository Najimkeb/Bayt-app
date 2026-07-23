CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`filename` text NOT NULL,
	`content_type` text,
	`format` text NOT NULL,
	`r2_key` text NOT NULL,
	`status` text NOT NULL,
	`error` text,
	`card_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `documents_user_created_idx` ON `documents` (`user_id`,`created_at`);
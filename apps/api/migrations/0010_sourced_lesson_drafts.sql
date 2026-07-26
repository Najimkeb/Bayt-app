-- Studio admin : brouillons de leçons sourcées (recherche web + audit).
CREATE TABLE `lesson_drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`created_by` text NOT NULL,
	`topic` text NOT NULL,
	`domain_id` text NOT NULL,
	`level` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);--> statement-breakpoint
CREATE INDEX `lesson_drafts_status_idx` ON `lesson_drafts` (`status`);--> statement-breakpoint
CREATE TABLE `draft_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`draft_id` text NOT NULL,
	`front` text NOT NULL,
	`back` text NOT NULL,
	`source_url` text NOT NULL,
	`source_extract` text NOT NULL,
	`audit_verdict` text NOT NULL,
	`audit_reason` text,
	`status` text DEFAULT 'to_review' NOT NULL,
	`position` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`draft_id`) REFERENCES `lesson_drafts`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
CREATE INDEX `draft_cards_draft_idx` ON `draft_cards` (`draft_id`,`position`);

CREATE TABLE `exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`lesson_id` text NOT NULL,
	`item_id` text NOT NULL,
	`position` integer NOT NULL,
	`type` text NOT NULL,
	`prompt` text NOT NULL,
	`payload` text NOT NULL,
	FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`item_id`) REFERENCES `learning_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `exercises_lesson_position_idx` ON `exercises` (`lesson_id`,`position`);--> statement-breakpoint
CREATE TABLE `lessons` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`created_at` integer NOT NULL
);

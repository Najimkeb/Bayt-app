CREATE TABLE `learning_items` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`front` text NOT NULL,
	`back` text NOT NULL,
	`source_ref` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `review_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`item_id` text NOT NULL,
	`grade` text NOT NULL,
	`reviewed_at` integer NOT NULL,
	`before_state` text NOT NULL,
	`before_stability` real NOT NULL,
	`before_difficulty` real NOT NULL,
	`before_due` integer NOT NULL,
	`before_last_reviewed_at` integer,
	`before_reps` integer NOT NULL,
	`before_lapses` integer NOT NULL,
	`before_learning_step` integer NOT NULL,
	`after_state` text NOT NULL,
	`after_stability` real NOT NULL,
	`after_difficulty` real NOT NULL,
	`after_due` integer NOT NULL,
	`after_last_reviewed_at` integer,
	`after_reps` integer NOT NULL,
	`after_lapses` integer NOT NULL,
	`after_learning_step` integer NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `learning_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `review_logs_user_reviewed_idx` ON `review_logs` (`user_id`,`reviewed_at`);--> statement-breakpoint
CREATE INDEX `review_logs_item_idx` ON `review_logs` (`item_id`);--> statement-breakpoint
CREATE TABLE `scheduling_state` (
	`user_id` text NOT NULL,
	`item_id` text NOT NULL,
	`stability` real NOT NULL,
	`difficulty` real NOT NULL,
	`state` text NOT NULL,
	`due` integer NOT NULL,
	`last_reviewed_at` integer,
	`reps` integer NOT NULL,
	`lapses` integer NOT NULL,
	`learning_step` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `item_id`),
	FOREIGN KEY (`item_id`) REFERENCES `learning_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `scheduling_state_user_due_idx` ON `scheduling_state` (`user_id`,`due`);
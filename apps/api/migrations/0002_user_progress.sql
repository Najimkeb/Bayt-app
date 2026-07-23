CREATE TABLE `user_progress` (
	`user_id` text PRIMARY KEY NOT NULL,
	`xp_total` integer NOT NULL,
	`xp_today` integer NOT NULL,
	`day` text,
	`streak` integer NOT NULL,
	`longest_streak` integer NOT NULL,
	`daily_goal` integer NOT NULL,
	`last_goal_day` text
);

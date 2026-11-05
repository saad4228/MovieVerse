CREATE TABLE IF NOT EXISTS `discovery_collections` (
	`id` text PRIMARY KEY NOT NULL,
	`generation` text,
	`last_success` integer,
	`last_attempt` integer,
	`error` text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `discovery_memberships` (
	`collection` text NOT NULL,
	`generation` text NOT NULL,
	`movie_id` integer NOT NULL,
	`rank` integer NOT NULL,
	`last_seen` integer NOT NULL,
	PRIMARY KEY(`collection`, `generation`, `movie_id`),
	FOREIGN KEY (`movie_id`) REFERENCES `discovery_movies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `discovery_membership_read` ON `discovery_memberships` (`collection`,`generation`,`rank`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `discovery_movies` (
	`id` integer PRIMARY KEY NOT NULL,
	`document` text NOT NULL,
	`title` text NOT NULL,
	`release_date` text NOT NULL,
	`language` text NOT NULL,
	`origins` text NOT NULL,
	`genres` text NOT NULL,
	`popularity` real NOT NULL,
	`rating` real NOT NULL,
	`votes` integer NOT NULL,
	`runtime` integer NOT NULL,
	`india_release` text,
	`us_release` text,
	`first_imported` integer NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `discovery_movie_title` ON `discovery_movies` (`title`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `discovery_movie_release` ON `discovery_movies` (`release_date`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `discovery_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`document` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `discovery_sync_lock` (
	`id` integer PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `discovery_sync_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`started` integer NOT NULL,
	`finished` integer,
	`status` text NOT NULL,
	`report` text DEFAULT '{}' NOT NULL
);

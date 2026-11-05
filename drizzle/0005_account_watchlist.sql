CREATE TABLE IF NOT EXISTS `user_watchlist` (
	`user_id` text NOT NULL,
	`movie_key` text NOT NULL,
	`added` integer NOT NULL,
	PRIMARY KEY(`user_id`, `movie_key`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `watchlist_user_added` ON `user_watchlist` (`user_id`,`added`);
CREATE TABLE `profile_photos` (
	`user_id` text PRIMARY KEY NOT NULL,
	`image` text NOT NULL,
	`updated` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

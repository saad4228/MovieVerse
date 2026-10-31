CREATE TABLE `blueprints` (
	`id` text PRIMARY KEY NOT NULL,
	`config` text NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `booking_seats` (
	`booking_id` text NOT NULL,
	`show_id` text NOT NULL,
	`seat_id` text NOT NULL,
	PRIMARY KEY(`show_id`, `seat_id`),
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`user_id` text,
	`show_id` text NOT NULL,
	`seats` text NOT NULL,
	`cart` text NOT NULL,
	`pricing` text NOT NULL,
	`snapshot` text NOT NULL,
	`token` text NOT NULL,
	`request_id` text NOT NULL,
	`status` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_token_unique` ON `bookings` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `booking_idempotency` ON `bookings` (`owner`,`request_id`);--> statement-breakpoint
CREATE INDEX `bookings_user` ON `bookings` (`user_id`);--> statement-breakpoint
CREATE INDEX `bookings_owner` ON `bookings` (`owner`);--> statement-breakpoint
CREATE TABLE `inventory` (
	`show_id` text NOT NULL,
	`seat_id` text NOT NULL,
	`status` text NOT NULL,
	`owner` text,
	`expires` integer,
	PRIMARY KEY(`show_id`, `seat_id`)
);
--> statement-breakpoint
CREATE INDEX `inventory_expiry` ON `inventory` (`expires`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`amount` integer NOT NULL,
	`status` text NOT NULL,
	`provider` text NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`expires` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password` text NOT NULL,
	`salt` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
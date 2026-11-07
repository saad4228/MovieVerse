CREATE TABLE IF NOT EXISTS `discovery_sync_collections` (
	`run_id` text NOT NULL,
	`collection` text NOT NULL,
	`generation` text NOT NULL,
	`planned_pages` integer NOT NULL,
	`next_page` integer NOT NULL DEFAULT 1,
	`total_pages` integer,
	`detail_cursor` integer NOT NULL DEFAULT 0,
	`status` text NOT NULL DEFAULT 'pending',
	`retry_count` integer NOT NULL DEFAULT 0,
	`error` text,
	`started` integer NOT NULL,
	`updated` integer NOT NULL,
	PRIMARY KEY(`run_id`, `collection`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `discovery_sync_items` (
	`run_id` text NOT NULL,
	`collection` text NOT NULL,
	`movie_id` integer NOT NULL,
	`rank` integer NOT NULL,
	`state` text NOT NULL DEFAULT 'pending',
	`retry_count` integer NOT NULL DEFAULT 0,
	`error` text,
	`updated` integer NOT NULL,
	PRIMARY KEY(`run_id`, `collection`, `movie_id`),
	FOREIGN KEY (`run_id`, `collection`) REFERENCES `discovery_sync_collections`(`run_id`, `collection`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `discovery_sync_collections_next` ON `discovery_sync_collections` (`run_id`,`status`,`collection`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `discovery_sync_items_pending` ON `discovery_sync_items` (`run_id`,`collection`,`state`,`rank`);

ALTER TABLE `discovery_sync_lock` ADD COLUMN `fence` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `discovery_sync_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`collection` text,
	`kind` text NOT NULL,
	`ordinal` integer NOT NULL,
	`status` text NOT NULL DEFAULT 'running',
	`attempts` integer NOT NULL DEFAULT 0,
	`started` integer NOT NULL,
	`finished` integer,
	`error` text,
	FOREIGN KEY (`run_id`) REFERENCES `discovery_sync_runs`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `discovery_sync_batches_run` ON `discovery_sync_batches` (`run_id`,`status`,`ordinal`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `discovery_sync_one_running` ON `discovery_sync_runs` (`status`) WHERE `status`='running';

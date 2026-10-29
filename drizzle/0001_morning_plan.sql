CREATE TABLE `briefs` (
	`date` text PRIMARY KEY NOT NULL,
	`text` text NOT NULL,
	`model` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `plan_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`task_key` text NOT NULL,
	`done_by` text,
	`done_at` text NOT NULL
);

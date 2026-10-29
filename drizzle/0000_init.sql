CREATE TABLE `audit_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `audit_items` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`label` text NOT NULL,
	`help` text DEFAULT '' NOT NULL,
	`priority` text NOT NULL,
	`service_ids` text DEFAULT '[]' NOT NULL,
	`auto_check` text,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `audits` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`industry_id` text,
	`goals` text DEFAULT '[]' NOT NULL,
	`goal_notes` text DEFAULT '' NOT NULL,
	`pain_offer_ids` text DEFAULT '[]' NOT NULL,
	`budget_monthly` integer,
	`readiness` text,
	`discovery` text,
	`responses` text DEFAULT '{}' NOT NULL,
	`custom_items` text DEFAULT '[]' NOT NULL,
	`consultant_notes` text DEFAULT '' NOT NULL,
	`rev` integer DEFAULT 1 NOT NULL,
	`created_by` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audits_client_idx` ON `audits` (`client_id`);--> statement-breakpoint
CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`business_name` text NOT NULL,
	`website` text DEFAULT '' NOT NULL,
	`industry_id` text,
	`contact_person` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`instagram` text DEFAULT '' NOT NULL,
	`linkedin` text DEFAULT '' NOT NULL,
	`youtube` text DEFAULT '' NOT NULL,
	`other_links` text DEFAULT '[]' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`next_follow_up` text,
	`last_contact_at` text,
	`created_by` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `clients_name_idx` ON `clients` (`business_name`);--> statement-breakpoint
CREATE TABLE `dependency_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`service_id` text NOT NULL,
	`requires_service_id` text NOT NULL,
	`reason` text NOT NULL,
	`active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `industries` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`cluster_id` text NOT NULL,
	`keywords` text DEFAULT '[]' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`origin` text DEFAULT 'admin' NOT NULL,
	`source_snapshot` text
);
--> statement-breakpoint
CREATE TABLE `industry_clusters` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer NOT NULL,
	`source_snapshot` text
);
--> statement-breakpoint
CREATE TABLE `offers` (
	`id` text PRIMARY KEY NOT NULL,
	`number` integer NOT NULL,
	`name` text NOT NULL,
	`cluster_id` text,
	`audience_label` text NOT NULL,
	`buyer_quote` text NOT NULL,
	`components` text NOT NULL,
	`upfront_kind` text NOT NULL,
	`upfront_min` integer,
	`upfront_max` integer,
	`upfront_included` integer DEFAULT false NOT NULL,
	`monthly_min` integer,
	`monthly_max` integer,
	`monthly_term_months` integer,
	`suggested_industry_ids` text DEFAULT '[]' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`delivery_cost_one_time` integer DEFAULT 0 NOT NULL,
	`delivery_cost_monthly` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`origin` text DEFAULT 'admin' NOT NULL,
	`source_snapshot` text,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`quote_id` text,
	`amount` integer NOT NULL,
	`received_on` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_by` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `quote_items` (
	`id` text PRIMARY KEY NOT NULL,
	`quote_id` text NOT NULL,
	`position` integer NOT NULL,
	`kind` text NOT NULL,
	`offer_id` text,
	`service_id` text,
	`name_snapshot` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price` integer NOT NULL,
	`billing_model` text NOT NULL,
	`setup_fee` integer NOT NULL,
	`recurring_fee` integer NOT NULL,
	`annual_fee` integer NOT NULL,
	`optional` integer NOT NULL,
	`line_total` integer NOT NULL,
	`notes` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `quote_items_quote_pos` ON `quote_items` (`quote_id`,`position`);--> statement-breakpoint
CREATE TABLE `quotes` (
	`id` text PRIMARY KEY NOT NULL,
	`number` text NOT NULL,
	`root_id` text NOT NULL,
	`version` integer NOT NULL,
	`client_id` text NOT NULL,
	`audit_id` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`issue_date` text,
	`valid_until` text,
	`doc` text NOT NULL,
	`totals` text NOT NULL,
	`one_time_total` integer DEFAULT 0 NOT NULL,
	`monthly_total` integer DEFAULT 0 NOT NULL,
	`annual_total` integer DEFAULT 0 NOT NULL,
	`one_time_net` integer DEFAULT 0 NOT NULL,
	`monthly_net` integer DEFAULT 0 NOT NULL,
	`annual_net` integer DEFAULT 0 NOT NULL,
	`discount_total` integer DEFAULT 0 NOT NULL,
	`tax_total` integer DEFAULT 0 NOT NULL,
	`initial_payment` integer DEFAULT 0 NOT NULL,
	`contract_value` integer,
	`public_token` text,
	`idempotency_key` text,
	`rev` integer DEFAULT 1 NOT NULL,
	`created_by` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`status_changed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `quotes_public_token_unique` ON `quotes` (`public_token`);--> statement-breakpoint
CREATE UNIQUE INDEX `quotes_idempotency_key_unique` ON `quotes` (`idempotency_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `quotes_root_version` ON `quotes` (`root_id`,`version`);--> statement-breakpoint
CREATE INDEX `quotes_client_idx` ON `quotes` (`client_id`);--> statement-breakpoint
CREATE INDEX `quotes_number_idx` ON `quotes` (`number`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`window_start` integer NOT NULL,
	`count` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recommendation_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`offer_id` text NOT NULL,
	`triggers` text NOT NULL,
	`min_score` integer NOT NULL,
	`outcome` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recommendations` (
	`id` text PRIMARY KEY NOT NULL,
	`audit_id` text NOT NULL,
	`key` text NOT NULL,
	`group` text NOT NULL,
	`offer_id` text,
	`service_id` text,
	`reason` text NOT NULL,
	`priority` text NOT NULL,
	`recommended_price` text DEFAULT '' NOT NULL,
	`decision` text DEFAULT 'pending' NOT NULL,
	`consultant_override` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `recommendations_audit_key` ON `recommendations` (`audit_id`,`key`);--> statement-breakpoint
CREATE TABLE `service_links` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer NOT NULL,
	`note` text,
	`source_snapshot` text
);
--> statement-breakpoint
CREATE TABLE `services` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`link_id` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`industry_ids` text DEFAULT '[]' NOT NULL,
	`default_model` text DEFAULT 'custom' NOT NULL,
	`price_options` text DEFAULT '[]' NOT NULL,
	`delivery_cost_one_time` integer DEFAULT 0 NOT NULL,
	`delivery_cost_monthly` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`origin` text DEFAULT 'admin' NOT NULL,
	`source_snapshot` text,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_by` text
);
--> statement-breakpoint
CREATE TABLE `sync_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`completed_at` text
);
--> statement-breakpoint
CREATE INDEX `sync_jobs_status_idx` ON `sync_jobs` (`status`);--> statement-breakpoint
CREATE INDEX `sync_jobs_entity_idx` ON `sync_jobs` (`entity`,`entity_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'consultant' NOT NULL,
	`can_override_prices` integer DEFAULT false NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
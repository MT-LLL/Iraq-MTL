CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`ip_hash` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`opportunity_id` text NOT NULL,
	`kind` text NOT NULL,
	`excerpt` text NOT NULL,
	`source_url` text,
	`collected_at` integer NOT NULL,
	FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `opportunities` (
	`id` text PRIMARY KEY NOT NULL,
	`external_id` text,
	`eplus_id` text,
	`title` text NOT NULL,
	`title_en` text,
	`country` text NOT NULL,
	`city` text,
	`industry` text NOT NULL,
	`stage` text NOT NULL,
	`priority` text NOT NULL,
	`score` integer NOT NULL,
	`confidence` real NOT NULL,
	`project_value` real,
	`addressable_value` real,
	`currency` text,
	`funding_status` text,
	`bid_deadline` integer,
	`participation_space` text,
	`win_band` text,
	`summary` text,
	`owner_id` text,
	`source_name` text NOT NULL,
	`source_url` text,
	`source_license` text,
	`review_status` text DEFAULT 'pending' NOT NULL,
	`is_golden_seed` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `partner_locks` (
	`id` text PRIMARY KEY NOT NULL,
	`opportunity_id` text NOT NULL,
	`partner_organization` text NOT NULL,
	`work_package` text NOT NULL,
	`huawei_owner_id` text,
	`status` text NOT NULL,
	`non_exclusive` integer DEFAULT true NOT NULL,
	`accepted_at` integer,
	`last_progress_at` integer,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`huawei_owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text,
	`phone` text,
	`name` text NOT NULL,
	`organization` text NOT NULL,
	`identity_type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`country_scope` text DEFAULT '[]' NOT NULL,
	`industry_scope` text DEFAULT '[]' NOT NULL,
	`approved_by` text,
	`approved_at` integer,
	`expires_at` integer,
	`created_at` integer NOT NULL
);

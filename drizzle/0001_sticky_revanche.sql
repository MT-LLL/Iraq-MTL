CREATE TABLE `push_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`audience` text NOT NULL,
	`channel` text NOT NULL,
	`recipient` text NOT NULL,
	`opportunity_ids` text NOT NULL,
	`status` text DEFAULT 'recorded' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `saved_views` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`filters` text NOT NULL,
	`created_at` integer NOT NULL
);

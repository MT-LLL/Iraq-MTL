CREATE TABLE `lead_distributions` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`opportunity_ids` text NOT NULL,
	`industry_tags` text NOT NULL,
	`assignee_id` text NOT NULL,
	`assignee_name` text NOT NULL,
	`assignee_email` text NOT NULL,
	`assignee_role` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`request_note` text,
	`response_note` text,
	`metadata` text DEFAULT '{}' NOT NULL,
	`requested_at` integer NOT NULL,
	`responded_at` integer
);

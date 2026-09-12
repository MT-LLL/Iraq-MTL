CREATE TABLE `source_scan_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `trigger` text NOT NULL,
  `status` text NOT NULL,
  `source_count` integer NOT NULL,
  `new_lead_count` integer NOT NULL DEFAULT 0,
  `updated_lead_count` integer NOT NULL DEFAULT 0,
  `promoted_count` integer NOT NULL DEFAULT 0,
  `summary` text NOT NULL,
  `metadata` text NOT NULL DEFAULT '{}',
  `started_at` integer NOT NULL,
  `finished_at` integer,
  `next_run_at` integer
);

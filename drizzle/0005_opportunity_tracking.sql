CREATE TABLE IF NOT EXISTS opportunity_tracking (
  opportunity_id TEXT PRIMARY KEY NOT NULL,
  status TEXT NOT NULL DEFAULT 'tracked',
  reason TEXT NOT NULL DEFAULT '',
  updated_by TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

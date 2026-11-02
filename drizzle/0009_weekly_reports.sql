CREATE TABLE IF NOT EXISTS weekly_reports (
  id TEXT PRIMARY KEY NOT NULL,
  week_start TEXT NOT NULL,
  week_end TEXT NOT NULL,
  audience TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  report_data TEXT NOT NULL,
  send_status TEXT NOT NULL DEFAULT 'draft',
  recipients TEXT NOT NULL DEFAULT '[]',
  provider_message_ids TEXT NOT NULL DEFAULT '[]',
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS weekly_reports_created_at_idx ON weekly_reports(created_at);

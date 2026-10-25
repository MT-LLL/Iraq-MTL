CREATE TABLE IF NOT EXISTS opportunity_contacts (
  id TEXT PRIMARY KEY NOT NULL,
  opportunity_id TEXT NOT NULL REFERENCES opportunities(id),
  role TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  company_phone TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_opportunity_contacts_opportunity_id
  ON opportunity_contacts(opportunity_id);

-- Add google_maps_id for upsert deduplication
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS google_maps_id text UNIQUE;

CREATE INDEX IF NOT EXISTS idx_companies_google_maps_id ON companies(google_maps_id);

-- Sync logs for tracking Apify imports
CREATE TABLE IF NOT EXISTS sync_logs (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  source        text        NOT NULL,
  dataset_id    text,
  actor_id      text,
  started_at    timestamptz NOT NULL,
  completed_at  timestamptz NOT NULL,
  total_items   integer     DEFAULT 0,
  inserted      integer     DEFAULT 0,
  updated       integer     DEFAULT 0,
  skipped       integer     DEFAULT 0,
  errors        integer     DEFAULT 0,
  error_message text,
  triggered_by  uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_source ON sync_logs(source);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created ON sync_logs(created_at DESC);

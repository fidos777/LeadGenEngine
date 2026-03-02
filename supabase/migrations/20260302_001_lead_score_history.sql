CREATE TABLE IF NOT EXISTS lead_score_history (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id       uuid        NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  company_id    uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  scored_at     timestamptz DEFAULT now() NOT NULL,
  scored_by     uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  fit_score     integer     NOT NULL CHECK (fit_score BETWEEN 0 AND 100),
  score_band    text        NOT NULL CHECK (score_band IN ('A','B','Warm','Park')),
  atap_eligible boolean     NOT NULL,
  atap_fail_reason text,
  signal_sector       integer,
  signal_zone         integer,
  signal_bill_band    integer,
  signal_roof_size    integer,
  signal_op_hours     integer,
  signal_md_sweet     integer,
  signal_ownership    integer,
  signal_tenant_bonus integer,
  company_snapshot    jsonb,
  trigger_event       text
);

CREATE INDEX IF NOT EXISTS idx_lsh_lead_id
  ON lead_score_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_lsh_scored_at
  ON lead_score_history(scored_at DESC);
CREATE INDEX IF NOT EXISTS idx_lsh_band
  ON lead_score_history(score_band);

CREATE OR REPLACE VIEW lead_latest_score AS
SELECT DISTINCT ON (lead_id)
  lead_id, fit_score, score_band, atap_eligible, scored_at, trigger_event
FROM lead_score_history
ORDER BY lead_id, scored_at DESC;

COMMENT ON TABLE lead_score_history IS
  'Immutable scoring snapshots. Append-only audit trail.';

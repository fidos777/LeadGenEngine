-- 009: SMP Monthly Tracking
-- Stores historical System Marginal Price data from Single Buyer Malaysia
-- Used by dossier generator for dynamic SMP modelling

CREATE TABLE IF NOT EXISTS smp_monthly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month date NOT NULL UNIQUE,  -- first of month, e.g. 2026-02-01
  average_smp numeric(5,4) NOT NULL,  -- RM/kWh, e.g. 0.2146
  source_url text DEFAULT 'https://www.singlebuyer.com.my/resources-marginal.php',
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_smp_month ON smp_monthly(month DESC);

-- Seed with estimated historical data (Jan 2025 – Feb 2026)
-- Based on published averages: ~20.46 sen/kWh avg Jan-Apr 2024,
-- with seasonal variation from fuel mix and demand patterns.
-- Replace with actual Single Buyer figures when available.
INSERT INTO smp_monthly (month, average_smp, notes) VALUES
  ('2025-01-01', 0.2080, 'Estimated — post-Raya low demand period'),
  ('2025-02-01', 0.1950, 'Estimated — Chinese New Year demand dip'),
  ('2025-03-01', 0.2120, 'Estimated — demand recovery'),
  ('2025-04-01', 0.2200, 'Estimated — pre-monsoon stable'),
  ('2025-05-01', 0.2310, 'Estimated — rising demand, hot season'),
  ('2025-06-01', 0.2420, 'Estimated — peak summer demand'),
  ('2025-07-01', 0.2350, 'Estimated — RP4 tariff reset July 1'),
  ('2025-08-01', 0.2280, 'Estimated — stabilising post-reset'),
  ('2025-09-01', 0.2190, 'Estimated — moderate demand'),
  ('2025-10-01', 0.2100, 'Estimated — monsoon onset, lower demand'),
  ('2025-11-01', 0.2050, 'Estimated — monsoon period'),
  ('2025-12-01', 0.2000, 'Estimated — year-end low'),
  ('2026-01-01', 0.2140, 'Estimated — ATAP launch month'),
  ('2026-02-01', 0.2180, 'Estimated — current month')
ON CONFLICT (month) DO UPDATE SET
  average_smp = EXCLUDED.average_smp,
  notes = EXCLUDED.notes;

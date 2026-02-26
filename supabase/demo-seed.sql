-- ============================================================
-- VOLTEK C&I COMMAND CENTER — DEMO SEED
-- Run this in Supabase SQL editor to populate demo data
-- All data is fictional but realistic for Selangor C&I solar
-- ============================================================

-- 1. COMPANIES (represents your 161 Apify-scraped factories)
-- Run schema migration first to add ATAP columns if not done:
ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS estimated_md_kw numeric,
  ADD COLUMN IF NOT EXISTS tenant_structure text DEFAULT 'unknown' 
    CHECK (tenant_structure IN ('single','multi','unknown')),
  ADD COLUMN IF NOT EXISTS operating_hours text DEFAULT 'unknown'
    CHECK (operating_hours IN ('day_dominant','shift','night_heavy','24hr','unknown')),
  ADD COLUMN IF NOT EXISTS estimated_roof_sqft numeric,
  ADD COLUMN IF NOT EXISTS tnb_bill_band text,
  ADD COLUMN IF NOT EXISTS atap_eligible boolean DEFAULT null,
  ADD COLUMN IF NOT EXISTS atap_disqualify_reason text,
  ADD COLUMN IF NOT EXISTS composite_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_tier text DEFAULT 'C';

-- ── TIER A PROSPECTS (score 75–100) ──────────────────────────
INSERT INTO companies (name, registration_no, sector, zone, estimated_md_kw, tenant_structure, operating_hours, estimated_roof_sqft, tnb_bill_band, atap_eligible, composite_score, score_tier)
VALUES
  ('Mega Plastics Industries Sdn Bhd', 'SSM-0412891-X', 'Plastics Manufacturing', 'Shah Alam', 350, 'single', 'day_dominant', 16800, 'RM35k-45k', true, 82, 'A'),
  ('Klang Metal Works Sdn Bhd', 'SSM-0389234-K', 'Metal Fabrication', 'Klang', 420, 'single', 'day_dominant', 21000, 'RM42k-55k', true, 78, 'A'),
  ('PJ Packaging Berhad', 'SSM-0501234-P', 'Packaging', 'Petaling Jaya', 280, 'single', 'day_dominant', 14000, 'RM28k-36k', true, 75, 'A'),
  ('Shah Alam Precision Engineering', 'SSM-0267834-T', 'CNC Machining', 'Shah Alam', 310, 'single', 'day_dominant', 15500, 'RM31k-40k', true, 74, 'A'),
  ('Subang Food Industries Sdn Bhd', 'SSM-0445678-R', 'Food Manufacturing', 'Subang', 390, 'single', 'day_dominant', 19500, 'RM38k-50k', true, 72, 'A'),

-- ── TIER B PROSPECTS (score 60–74) ──────────────────────────
  ('Klang Rubber Products Sdn Bhd', 'SSM-0312456-M', 'Rubber Manufacturing', 'Klang', 260, 'single', 'shift', 13000, 'RM25k-32k', true, 68, 'B'),
  ('Puchong Steel Fabrication', 'SSM-0478901-N', 'Steel Works', 'Puchong', 300, 'single', 'day_dominant', 15000, 'RM29k-38k', true, 66, 'B'),
  ('Port Klang Plastics Bhd', 'SSM-0234567-L', 'Plastics Mfg', 'Port Klang', 220, 'single', 'day_dominant', 11000, 'RM21k-28k', true, 65, 'B'),
  ('Subang Printing Industries', 'SSM-0567890-Q', 'Printing', 'Subang', 240, 'single', 'day_dominant', 12000, 'RM23k-30k', true, 63, 'B'),
  ('Klang Auto Parts Sdn Bhd', 'SSM-0623456-V', 'Auto Components', 'Klang', 280, 'single', 'shift', 14000, 'RM26k-34k', true, 61, 'B'),

-- ── DISQUALIFIED PROSPECTS (ATAP ineligible) ─────────────────
  ('Klang Industrial Complex', 'SSM-0701234-W', 'Mixed Industrial', 'Klang', 800, 'multi', 'unknown', 0, 'unknown', false, 28, 'D'),
  ('PJ Commercial Tower', 'SSM-0812345-X', 'Commercial Office', 'Petaling Jaya', 150, 'multi', 'unknown', 0, 'unknown', false, 15, 'D'),
  ('Shah Alam Cold Storage', 'SSM-0934567-Y', 'Cold Storage', 'Shah Alam', 200, 'single', 'night_heavy', 10000, 'RM18k-24k', false, 22, 'D'),
  ('Klang Logistics Hub', 'SSM-1023456-Z', 'Warehouse/Logistics', 'Klang', 180, 'multi', 'unknown', 0, 'unknown', false, 19, 'D'),
  ('Subang Service Centre', 'SSM-1134567-A', 'Auto Service', 'Subang', 90, 'single', 'day_dominant', 4500, 'RM8k-12k', false, 35, 'D')
ON CONFLICT (registration_no) DO UPDATE SET
  composite_score = EXCLUDED.composite_score,
  atap_eligible = EXCLUDED.atap_eligible,
  score_tier = EXCLUDED.score_tier;

-- Update disqualify reasons
UPDATE companies SET atap_disqualify_reason = 'Multi-tenant structure — excluded under GP/ST/No.60/2025'
  WHERE name IN ('Klang Industrial Complex','PJ Commercial Tower','Klang Logistics Hub');
UPDATE companies SET atap_disqualify_reason = 'Night-heavy operations — high forfeiture risk under ATAP no-rollover rule'
  WHERE name = 'Shah Alam Cold Storage';
UPDATE companies SET atap_disqualify_reason = 'MD below minimum viable threshold for meaningful ROI'
  WHERE name = 'Subang Service Centre';


-- 2. CONTACTS (decision makers with direct numbers)
CREATE TABLE IF NOT EXISTS contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text,
  authority_level integer DEFAULT 3 CHECK (authority_level BETWEEN 1 AND 5),
  phone text,
  whatsapp text,
  email text,
  linkedin text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Get company IDs dynamically for contacts
DO $$
DECLARE
  mega_id uuid;
  klang_metal_id uuid;
  pj_pack_id uuid;
  subang_food_id uuid;
BEGIN
  SELECT id INTO mega_id FROM companies WHERE name = 'Mega Plastics Industries Sdn Bhd';
  SELECT id INTO klang_metal_id FROM companies WHERE name = 'Klang Metal Works Sdn Bhd';
  SELECT id INTO pj_pack_id FROM companies WHERE name = 'PJ Packaging Berhad';
  SELECT id INTO subang_food_id FROM companies WHERE name = 'Subang Food Industries Sdn Bhd';

  INSERT INTO contacts (company_id, name, role, authority_level, phone, notes)
  VALUES
    (mega_id, 'En. Ahmad Razak bin Othman', 'Director / Owner', 5, '+60 12-334 5678', 'Confirmed building owner. Direct decision authority. Responded positively to energy cost discussion.'),
    (klang_metal_id, 'Mr. Tan Kee Wah', 'Managing Director', 5, '+60 16-789 0123', 'Owner-operated since 1998. Concerns about capex — may be receptive to PPA framing.'),
    (pj_pack_id, 'Puan Noraini binti Hassan', 'GM Operations', 3, '+60 12-456 7890', 'Reports to board. Appointment confirmed but needs director sign-off for final contract.'),
    (subang_food_id, 'Mr. Lim Chong Wei', 'CEO', 5, '+60 17-234 5678', 'Interested but asked for written analysis first. Sent pre-survey report Feb 24.');
END $$;


-- 3. LEADS (across all pipeline stages for demo visibility)
-- Assumes your leads table has the extended status enum
-- Run this first if needed:
-- ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'atap_eligible';
-- ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'survey_complete';

DO $$
DECLARE
  mega_id uuid;
  klang_metal_id uuid;
  pj_pack_id uuid;
  klang_rubber_id uuid;
  puchong_steel_id uuid;
  port_klang_id uuid;
  subang_print_id uuid;
  klang_auto_id uuid;
  shah_precision_id uuid;
  subang_food_id uuid;
BEGIN
  SELECT id INTO mega_id FROM companies WHERE name = 'Mega Plastics Industries Sdn Bhd';
  SELECT id INTO klang_metal_id FROM companies WHERE name = 'Klang Metal Works Sdn Bhd';
  SELECT id INTO pj_pack_id FROM companies WHERE name = 'PJ Packaging Berhad';
  SELECT id INTO klang_rubber_id FROM companies WHERE name = 'Klang Rubber Products Sdn Bhd';
  SELECT id INTO puchong_steel_id FROM companies WHERE name = 'Puchong Steel Fabrication';
  SELECT id INTO port_klang_id FROM companies WHERE name = 'Port Klang Plastics Bhd';
  SELECT id INTO subang_print_id FROM companies WHERE name = 'Subang Printing Industries';
  SELECT id INTO klang_auto_id FROM companies WHERE name = 'Klang Auto Parts Sdn Bhd';
  SELECT id INTO shah_precision_id FROM companies WHERE name = 'Shah Alam Precision Engineering';
  SELECT id INTO subang_food_id FROM companies WHERE name = 'Subang Food Industries Sdn Bhd';

  INSERT INTO leads (
    company_id, status, estimated_kwp, estimated_contract_value,
    close_probability, assigned_to, notes, created_at, updated_at
  )
  VALUES
    -- Survey-ready (highest stage in demo)
    (mega_id, 'appointment_booked', 280, 560000, 0.65, 'azrul@voltek.com.my',
     'Pre-survey report delivered Feb 24. Site visit confirmed for next week. EN Ahmad Razak is owner-direct.', now() - interval '10 days', now()),

    -- Proposal stage
    (klang_metal_id, 'appointment_booked', 350, 700000, 0.55, 'azrul@voltek.com.my',
     'Proposal sent Feb 20. Following up Tuesday. Owner Tan Kee Wah — may need PPA option.', now() - interval '15 days', now() - interval '2 days'),

    -- Appointment confirmed
    (pj_pack_id, 'appointment_booked', 220, 440000, 0.45, 'farid@voltek.com.my',
     'Site visit Monday. GM confirmed but needs board sign-off. Pre-survey report helps here.', now() - interval '8 days', now() - interval '1 day'),

    -- Qualified / ATAP screened
    (shah_precision_id, 'qualified', 310, 620000, 0.35, 'azrul@voltek.com.my',
     'ATAP eligible confirmed. Score 74. Enrichment complete. Ready for outreach call.', now() - interval '5 days', now() - interval '1 day'),

    (subang_food_id, 'responded', 300, 600000, 0.30, 'farid@voltek.com.my',
     'CEO interested but requested written analysis. Pre-survey report sent. Await response.', now() - interval '6 days', now() - interval '2 days'),

    -- Outreach stage
    (klang_rubber_id, 'outreached', 260, 520000, 0.20, 'azrul@voltek.com.my',
     'First call — reached admin. Callback requested. Objection: shift operations.', now() - interval '3 days', now()),

    (puchong_steel_id, 'outreached', 300, 600000, 0.20, 'farid@voltek.com.my',
     'Voicemail left. Attempting again Wed. Score 66.', now() - interval '2 days', now()),

    -- Identified (not yet called)
    (port_klang_id, 'identified', 220, 440000, 0.10, null,
     'Scored 65. Owner address confirmed via SSM. Assign to caller.', now() - interval '1 day', now()),

    (subang_print_id, 'identified', 240, 480000, 0.10, null,
     'Scored 63. Website shows factory expansion news. Good trigger signal.', now() - interval '1 day', now()),

    (klang_auto_id, 'identified', 280, 560000, 0.10, null,
     'Scored 61. Shift operations — flag for day-load confirmation before outreach.', now(), now());
END $$;


-- 4. ACTIVITIES (call logs and notes for Mega Plastics)
DO $$
DECLARE
  mega_lead_id uuid;
BEGIN
  SELECT l.id INTO mega_lead_id 
  FROM leads l 
  JOIN companies c ON l.company_id = c.id
  WHERE c.name = 'Mega Plastics Industries Sdn Bhd'
  LIMIT 1;

  INSERT INTO activities (lead_id, activity_type, performed_by, notes, metadata, created_at)
  VALUES
    (mega_lead_id, 'system', 'system', 
     'Lead identified via Apify scrape. Zone: Shah Alam Seksyen 26. Composite score: 82.',
     '{"score": 82, "zone": "Shah Alam", "source": "apify_maps"}',
     now() - interval '12 days'),

    (mega_lead_id, 'call', 'azrul@voltek.com.my',
     'First contact. Reached admin, referred to En. Ahmad Razak. Called back same day. Confirmed owner and building ownership.',
     '{"duration_min": 7, "authority_confirmed": true, "objection": null}',
     now() - interval '10 days'),

    (mega_lead_id, 'call', 'azrul@voltek.com.my',
     'Spoke with En. Ahmad Razak directly. High interest. Asked for written energy analysis before committing to site visit.',
     '{"duration_min": 12, "authority_level": 5, "objection": "send_report_first"}',
     now() - interval '8 days'),

    (mega_lead_id, 'note', 'system',
     'Pre-survey report generated: Mega Plastics Industries. System: 280 kWp. ATAP eligible. Savings RM111,821/year base case.',
     '{"report_type": "pre_survey", "kwp": 280, "atap_eligible": true, "annual_savings_base": 111821}',
     now() - interval '6 days'),

    (mega_lead_id, 'email', 'azrul@voltek.com.my',
     'Pre-survey report sent to En. Ahmad Razak via email. PDF attached.',
     '{"report_sent": true, "delivery": "email"}',
     now() - interval '6 days'),

    (mega_lead_id, 'call', 'azrul@voltek.com.my',
     'En. Ahmad Razak reviewed report. Impressed with ATAP sizing analysis. Site visit confirmed. Availability: next Tuesday or Wednesday.',
     '{"duration_min": 8, "outcome": "appointment_confirmed", "next_action": "book_site_visit"}',
     now() - interval '2 days');
END $$;


-- 5. VERIFICATION QUERY — run this to check data loaded correctly
SELECT 
  'Companies loaded' as check_item,
  count(*) as count,
  count(CASE WHEN atap_eligible = true THEN 1 END) as atap_pass,
  count(CASE WHEN atap_eligible = false THEN 1 END) as atap_fail
FROM companies

UNION ALL

SELECT 
  'Leads loaded',
  count(*),
  count(CASE WHEN status IN ('appointment_booked','qualified','responded') THEN 1 END),
  count(CASE WHEN status IN ('identified','outreached') THEN 1 END)
FROM leads

UNION ALL

SELECT 
  'Activities loaded',
  count(*),
  0, 0
FROM activities;

-- Expected output:
-- Companies loaded | 15 | 10 | 5
-- Leads loaded     | 10 |  5 | 5
-- Activities loaded|  6 |  0 | 0

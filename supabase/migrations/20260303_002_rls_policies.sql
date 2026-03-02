-- Add org_id for multi-tenant isolation
ALTER TABLE profiles   ADD COLUMN IF NOT EXISTS org_id uuid;
ALTER TABLE companies  ADD COLUMN IF NOT EXISTS org_id uuid;
ALTER TABLE contacts   ADD COLUMN IF NOT EXISTS org_id uuid;
ALTER TABLE leads      ADD COLUMN IF NOT EXISTS org_id uuid;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS org_id uuid;

-- Default existing data to Voltek (org 001)
UPDATE profiles   SET org_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE org_id IS NULL;
UPDATE companies  SET org_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE org_id IS NULL;
UPDATE contacts   SET org_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE org_id IS NULL;
UPDATE leads      SET org_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE org_id IS NULL;
UPDATE activities SET org_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE org_id IS NULL;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION auth_role()
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT role::text FROM profiles WHERE id = auth.uid()
$$;

-- Helper: get current user's org_id
CREATE OR REPLACE FUNCTION auth_org_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT org_id FROM profiles WHERE id = auth.uid()
$$;

-- Enable RLS
ALTER TABLE companies  ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads      ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Operator policies: full access within their org
CREATE POLICY companies_operator ON companies FOR ALL TO authenticated
  USING (auth_role() = 'operator' AND org_id = auth_org_id())
  WITH CHECK (auth_role() = 'operator' AND org_id = auth_org_id());

CREATE POLICY leads_operator ON leads FOR ALL TO authenticated
  USING (auth_role() = 'operator' AND org_id = auth_org_id())
  WITH CHECK (auth_role() = 'operator' AND org_id = auth_org_id());

CREATE POLICY contacts_operator ON contacts FOR ALL TO authenticated
  USING (auth_role() = 'operator' AND org_id = auth_org_id())
  WITH CHECK (auth_role() = 'operator' AND org_id = auth_org_id());

CREATE POLICY activities_operator ON activities FOR ALL TO authenticated
  USING (auth_role() = 'operator' AND org_id = auth_org_id());

-- Caller policies: read-only within their org
CREATE POLICY companies_caller_read ON companies FOR SELECT TO authenticated
  USING (auth_role() = 'caller' AND org_id = auth_org_id());

CREATE POLICY contacts_caller_read ON contacts FOR SELECT TO authenticated
  USING (auth_role() = 'caller' AND org_id = auth_org_id());

CREATE POLICY leads_caller_read ON leads FOR SELECT TO authenticated
  USING (auth_role() = 'caller' AND org_id = auth_org_id());

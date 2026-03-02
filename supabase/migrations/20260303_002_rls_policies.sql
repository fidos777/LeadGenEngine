ALTER TABLE profiles   ADD COLUMN IF NOT EXISTS org_id uuid;
ALTER TABLE companies  ADD COLUMN IF NOT EXISTS org_id uuid;
ALTER TABLE contacts   ADD COLUMN IF NOT EXISTS org_id uuid;
ALTER TABLE leads      ADD COLUMN IF NOT EXISTS org_id uuid;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS org_id uuid;

UPDATE profiles   SET org_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE org_id IS NULL;
UPDATE companies  SET org_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE org_id IS NULL;
UPDATE contacts   SET org_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE org_id IS NULL;
UPDATE leads      SET org_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE org_id IS NULL;
UPDATE activities SET org_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE org_id IS NULL;

CREATE OR REPLACE FUNCTION auth_role()
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT atlas_role::text FROM profiles WHERE id = auth.uid()
$$;

ALTER TABLE companies  ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads      ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY companies_operator ON companies FOR ALL TO authenticated
  USING (auth_role() = 'operator') WITH CHECK (auth_role() = 'operator');
CREATE POLICY leads_operator ON leads FOR ALL TO authenticated
  USING (auth_role() = 'operator') WITH CHECK (auth_role() = 'operator');
CREATE POLICY contacts_operator ON contacts FOR ALL TO authenticated
  USING (auth_role() = 'operator') WITH CHECK (auth_role() = 'operator');
CREATE POLICY activities_operator ON activities FOR ALL TO authenticated
  USING (auth_role() = 'operator');
CREATE POLICY companies_caller_read ON companies FOR SELECT TO authenticated
  USING (auth_role() = 'caller');
CREATE POLICY contacts_caller_read ON contacts FOR SELECT TO authenticated
  USING (auth_role() = 'caller');

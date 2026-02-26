-- Atomic lead creation with activity audit trail
-- Part of full audit completeness: all mutations go through RPC

-- 1. Add client_id column if not exists (for multi-client support)
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS client_id uuid;

CREATE INDEX IF NOT EXISTS idx_leads_client ON leads(client_id);

-- 2. Create atomic lead creation RPC
CREATE OR REPLACE FUNCTION create_lead_with_activity(
  p_company_id uuid,
  p_contact_id uuid DEFAULT NULL,
  p_client_id uuid DEFAULT NULL,
  p_opportunity_type text DEFAULT 'solar',
  p_notes text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_lead_id uuid;
  v_result json;
BEGIN
  -- 1. Validate required fields
  IF p_company_id IS NULL THEN
    RAISE EXCEPTION 'company_id is required';
  END IF;

  IF p_opportunity_type IS NULL OR p_opportunity_type = '' THEN
    RAISE EXCEPTION 'opportunity_type is required';
  END IF;

  -- 2. Insert lead with initial status
  INSERT INTO leads (
    company_id,
    contact_id,
    client_id,
    opportunity_type,
    notes,
    status,
    qualification_json,
    created_at,
    updated_at
  )
  VALUES (
    p_company_id,
    p_contact_id,
    p_client_id,
    p_opportunity_type,
    p_notes,
    'identified'::lead_status,
    '{}'::jsonb,
    now(),
    now()
  )
  RETURNING id INTO v_lead_id;

  -- 3. Insert creation activity with actor attribution
  INSERT INTO activities (
    lead_id,
    action,
    metadata,
    actor_id,
    created_at
  )
  VALUES (
    v_lead_id,
    'lead_created',
    jsonb_build_object(
      'company_id', p_company_id,
      'opportunity_type', p_opportunity_type,
      'initial_status', 'identified'
    ),
    p_actor_id,
    now()
  );

  -- 4. Return created lead with company
  SELECT json_build_object(
    'id', l.id,
    'company_id', l.company_id,
    'contact_id', l.contact_id,
    'client_id', l.client_id,
    'opportunity_type', l.opportunity_type,
    'status', l.status,
    'notes', l.notes,
    'qualification_json', l.qualification_json,
    'created_at', l.created_at,
    'updated_at', l.updated_at
  )
  INTO v_result
  FROM leads l
  WHERE l.id = v_lead_id;

  RETURN v_result;
END;
$$;

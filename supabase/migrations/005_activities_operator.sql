-- Add operator attribution to activities
-- Required for audit trail integrity

ALTER TABLE activities
ADD COLUMN operator_id uuid REFERENCES auth.users(id);

CREATE INDEX idx_activities_operator ON activities(operator_id);

-- Update RPC to include operator_id in inserts
CREATE OR REPLACE FUNCTION execute_lead_action(
  p_lead_id uuid,
  p_operator_id uuid,
  p_activity_metadata jsonb,
  p_new_status text default null
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_status text;
  v_result json;
BEGIN
  -- 1. Fetch current status with row lock
  SELECT status INTO v_current_status
  FROM leads
  WHERE id = p_lead_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;

  -- 2. Validate transition if requested
  IF p_new_status IS NOT NULL THEN
    IF v_current_status = p_new_status THEN
      RAISE EXCEPTION 'New status equals current status';
    END IF;
  END IF;

  -- 3. Insert primary activity (activity_logged) with operator
  INSERT INTO activities (
    lead_id,
    action,
    metadata,
    operator_id,
    created_at
  )
  VALUES (
    p_lead_id,
    'activity_logged',
    p_activity_metadata,
    p_operator_id,
    now()
  );

  -- 4. If status transition requested
  IF p_new_status IS NOT NULL THEN
    UPDATE leads
    SET status = p_new_status::lead_status,
        updated_at = now()
    WHERE id = p_lead_id;

    INSERT INTO activities (
      lead_id,
      action,
      metadata,
      operator_id,
      created_at
    )
    VALUES (
      p_lead_id,
      'status_changed',
      jsonb_build_object(
        'from', v_current_status,
        'to', p_new_status
      ),
      p_operator_id,
      now()
    );
  END IF;

  -- 5. Return updated lead snapshot
  SELECT json_build_object(
    'id', l.id,
    'status', l.status,
    'updated_at', l.updated_at
  )
  INTO v_result
  FROM leads l
  WHERE l.id = p_lead_id;

  RETURN v_result;
END;
$$;

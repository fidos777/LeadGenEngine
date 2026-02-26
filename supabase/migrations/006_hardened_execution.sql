-- Hardened execution: actor tracking + qualification gate enforcement
-- This replaces the previous RPC with DB-level invariant protection

-- 1. Rename operator_id to actor_id for consistency
ALTER TABLE activities
RENAME COLUMN operator_id TO actor_id;

-- 2. Add qualification_json to leads
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS qualification_json jsonb DEFAULT '{}'::jsonb;

-- 3. Create hardened RPC with transition + qualification enforcement
CREATE OR REPLACE FUNCTION execute_lead_action(
  p_lead_id uuid,
  p_actor_id uuid,
  p_activity_metadata jsonb,
  p_new_status text DEFAULT NULL,
  p_qualification jsonb DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_status text;
  v_result json;
  v_valid boolean := false;
  v_effective_qualification jsonb;
BEGIN
  -- 1. Lock lead row
  SELECT status, COALESCE(qualification_json, '{}'::jsonb)
    INTO v_current_status, v_effective_qualification
  FROM leads
  WHERE id = p_lead_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;

  -- 2. If qualification update provided, apply it first
  IF p_qualification IS NOT NULL THEN
    v_effective_qualification := p_qualification;

    UPDATE leads
    SET qualification_json = v_effective_qualification,
        updated_at = now()
    WHERE id = p_lead_id;

    INSERT INTO activities (lead_id, action, metadata, actor_id, created_at)
    VALUES (
      p_lead_id,
      'qualification_updated',
      v_effective_qualification,
      p_actor_id,
      now()
    );
  END IF;

  -- 3. Transition validation (DB-enforced invariant)
  IF p_new_status IS NOT NULL THEN
    -- Prevent same-status mutation
    IF p_new_status = v_current_status THEN
      RAISE EXCEPTION 'New status equals current status';
    END IF;

    -- VALID_TRANSITIONS enforcement (mirrors TypeScript)
    CASE v_current_status
      WHEN 'identified' THEN
        v_valid := p_new_status IN ('outreached', 'closed_lost');
      WHEN 'outreached' THEN
        v_valid := p_new_status IN ('responded', 'closed_lost');
      WHEN 'responded' THEN
        v_valid := p_new_status IN ('qualified', 'closed_lost');
      WHEN 'qualified' THEN
        v_valid := p_new_status IN ('appointment_booked', 'closed_lost');
      WHEN 'appointment_booked' THEN
        v_valid := p_new_status IN ('closed_won', 'closed_lost');
      WHEN 'closed_won' THEN
        v_valid := false;
      WHEN 'closed_lost' THEN
        v_valid := false;
      ELSE
        RAISE EXCEPTION 'Unknown current status: %', v_current_status;
    END CASE;

    IF NOT v_valid THEN
      RAISE EXCEPTION 'Invalid transition: % → %', v_current_status, p_new_status;
    END IF;

    -- 4. Qualification Gate Enforcement (DB-level)
    IF p_new_status = 'qualified' THEN
      IF NOT (
        COALESCE((v_effective_qualification->>'owner_present')::boolean, false) AND
        COALESCE((v_effective_qualification->>'own_building')::boolean, false) AND
        COALESCE((v_effective_qualification->>'roof_suitable')::boolean, false) AND
        COALESCE((v_effective_qualification->>'sufficient_tnb')::boolean, false) AND
        COALESCE((v_effective_qualification->>'budget_confirmed')::boolean, false) AND
        COALESCE((v_effective_qualification->>'timeline_valid')::boolean, false) AND
        COALESCE((v_effective_qualification->>'decision_maker_identified')::boolean, false) AND
        COALESCE((v_effective_qualification->>'compliance_checked')::boolean, false)
      ) THEN
        RAISE EXCEPTION 'Qualification gate incomplete. Cannot transition to qualified.';
      END IF;
    END IF;
  END IF;

  -- 5. Insert primary activity log with actor attribution
  INSERT INTO activities (lead_id, action, metadata, actor_id, created_at)
  VALUES (
    p_lead_id,
    'activity_logged',
    p_activity_metadata,
    p_actor_id,
    now()
  );

  -- 6. Apply status change + audit log
  IF p_new_status IS NOT NULL THEN
    UPDATE leads
    SET status = p_new_status::lead_status,
        updated_at = now()
    WHERE id = p_lead_id;

    INSERT INTO activities (lead_id, action, metadata, actor_id, created_at)
    VALUES (
      p_lead_id,
      'status_changed',
      jsonb_build_object('from', v_current_status, 'to', p_new_status),
      p_actor_id,
      now()
    );
  END IF;

  -- 7. Return updated lead snapshot
  SELECT json_build_object(
    'id', l.id,
    'status', l.status,
    'updated_at', l.updated_at,
    'qualification_json', l.qualification_json
  )
  INTO v_result
  FROM leads l
  WHERE l.id = p_lead_id;

  RETURN v_result;
END;
$$;

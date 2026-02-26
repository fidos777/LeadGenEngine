-- Atomic lead execution RPC
-- Single transaction for activity + status change
-- No partial state possible

create or replace function execute_lead_action(
  p_lead_id uuid,
  p_operator_id uuid,
  p_activity_metadata jsonb,
  p_new_status text default null
)
returns json
language plpgsql
as $$
declare
  v_current_status text;
  v_result json;
begin
  -- 1. Fetch current status with row lock
  select status into v_current_status
  from leads
  where id = p_lead_id
  for update;

  if not found then
    raise exception 'Lead not found';
  end if;

  -- 2. Validate transition if requested
  if p_new_status is not null then
    if v_current_status = p_new_status then
      raise exception 'New status equals current status';
    end if;
  end if;

  -- 3. Insert primary activity (activity_logged)
  insert into activities (
    lead_id,
    action,
    metadata,
    created_at
  )
  values (
    p_lead_id,
    'activity_logged',
    p_activity_metadata,
    now()
  );

  -- 4. If status transition requested
  if p_new_status is not null then
    update leads
    set status = p_new_status::lead_status,
        updated_at = now()
    where id = p_lead_id;

    insert into activities (
      lead_id,
      action,
      metadata,
      created_at
    )
    values (
      p_lead_id,
      'status_changed',
      jsonb_build_object(
        'from', v_current_status,
        'to', p_new_status
      ),
      now()
    );
  end if;

  -- 5. Return updated lead snapshot
  select json_build_object(
    'id', l.id,
    'status', l.status,
    'updated_at', l.updated_at
  )
  into v_result
  from leads l
  where l.id = p_lead_id;

  return v_result;
end;
$$;

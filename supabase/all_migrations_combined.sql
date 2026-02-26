-- LeadGenEngine Schema v0.1
-- Minimal Safe Foundation
-- Revenue-first, migration-aware, multi-niche tolerant

-- 1. Companies
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  registration_no text,
  sector text,
  zone text,
  created_at timestamptz default now()
);

-- 2. Contacts (directors, gatekeepers, etc.)
create table contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  full_name text not null,
  role text,
  phone text,
  email text,
  source text default 'ssm',
  created_at timestamptz default now()
);

-- 3. Lead status enum (minimal booking flow)
create type lead_status as enum (
  'identified',
  'outreached',
  'responded',
  'qualified',
  'appointment_booked',
  'closed_won',
  'closed_lost'
);

-- 4. Leads
create table leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  opportunity_type text not null, -- 'solar' | 'fire' | future types
  status lead_status default 'identified',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes for common queries
create index idx_companies_zone on companies(zone);
create index idx_companies_sector on companies(sector);
create index idx_contacts_company on contacts(company_id);
create index idx_leads_company on leads(company_id);
create index idx_leads_status on leads(status);
create index idx_leads_opportunity_type on leads(opportunity_type);
-- Activities audit trail
-- Logs discovery events and lifecycle transitions

create table activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  action text not null,
  metadata jsonb,
  created_at timestamptz default now()
);

-- Index for querying activities by lead
create index idx_activities_lead on activities(lead_id);
create index idx_activities_action on activities(action);
create index idx_activities_created on activities(created_at);
-- Atlas Role Profiles
-- Session-derived role enforcement
-- Source of truth for user permissions

create type atlas_role as enum (
  'operator',
  'caller',
  'client'
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role atlas_role not null default 'caller',
  created_at timestamptz default now()
);

create index idx_profiles_role on profiles(role);

-- Auto-create profile on user signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'caller');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
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

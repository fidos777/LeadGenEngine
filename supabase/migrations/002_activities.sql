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

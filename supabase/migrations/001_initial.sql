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

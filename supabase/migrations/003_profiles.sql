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

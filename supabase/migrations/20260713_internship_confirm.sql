-- Add confirmed status to internship applications
alter table internship_applications drop constraint if exists internship_applications_status_check;
alter table internship_applications add constraint internship_applications_status_check check (status in ('pending', 'reviewed', 'accepted', 'rejected', 'confirmed'));

alter table internship_applications add column if not exists confirmed_at timestamp with time zone;
alter table internship_applications add column if not exists confirmed_by uuid references profiles(id) on delete set null;

-- Simple cohort groups for confirmed applicants
create table if not exists intern_cohorts (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  description text,
  whatsapp_group_link text,
  created_at timestamp with time zone default now()
);

create table if not exists intern_cohort_members (
  id uuid default gen_random_uuid() primary key,
  cohort_id uuid references intern_cohorts(id) on delete cascade,
  application_id uuid references internship_applications(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  joined_at timestamp with time zone default now(),
  unique (application_id, cohort_id)
);

create index if not exists idx_intern_cohort_members_cohort on intern_cohort_members(cohort_id);
create index if not exists idx_intern_cohort_members_user on intern_cohort_members(user_id);

insert into supabase_migrations.schema_migrations (version) values ('20260713_internship_confirm');

create table if not exists testers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  full_name text,
  phone text,
  status text default 'pending' check (status in ('pending', 'approved', 'blocked')),
  invited_at timestamp default now(),
  approved_at timestamp,
  last_login timestamp,
  device_brand text,
  device_model text,
  android_version text
);

create table if not exists testing_builds (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  build_number text not null,
  release_date timestamp default now(),
  status text default 'active' check (status in ('active', 'paused', 'completed')),
  play_store_url text,
  install_enabled boolean default true,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create table if not exists release_notes (
  id uuid primary key default gen_random_uuid(),
  build_id uuid references testing_builds(id) on delete cascade,
  new_features text,
  improvements text,
  bug_fixes text,
  known_limitations text,
  created_at timestamp default now()
);

create table if not exists bug_reports (
  id uuid primary key default gen_random_uuid(),
  tester_id uuid references testers(id) on delete set null,
  category text not null check (category in ('ui', 'performance', 'crash', 'feature', 'other')),
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  title text not null,
  description text,
  steps_to_reproduce text,
  expected_result text,
  actual_result text,
  screenshot_url text,
  screen_recording_url text,
  device_brand text,
  device_model text,
  android_version text,
  app_version text,
  status text default 'open' check (status in ('open', 'in_progress', 'testing', 'resolved', 'closed')),
  assigned_developer text,
  internal_notes text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create table if not exists feature_requests (
  id uuid primary key default gen_random_uuid(),
  tester_id uuid references testers(id) on delete set null,
  title text not null,
  description text,
  business_value text,
  priority text default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  status text default 'submitted' check (status in ('submitted', 'accepted', 'rejected', 'planned', 'in_development', 'completed')),
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  tester_id uuid references testers(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  overall_experience text,
  suggestions text,
  created_at timestamp default now()
);

create table if not exists known_issues (
  id uuid primary key default gen_random_uuid(),
  build_id uuid references testing_builds(id) on delete cascade,
  title text not null,
  description text,
  workaround text,
  severity text default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  status text default 'open' check (status in ('open', 'in_progress', 'resolved')),
  created_at timestamp default now()
);

alter table testing_builds enable row level security;
alter table testers enable row level security;
alter table bug_reports enable row level security;
alter table feature_requests enable row level security;
alter table feedback enable row level security;
alter table release_notes enable row level security;
alter table known_issues enable row level security;

create policy testers_admin_all on testers for all using (
  exists (select 1 from admin_users where id = auth.uid() and role in ('founder', 'super_admin', 'hr_admin'))
);

create policy builds_admin_all on testing_builds for all using (
  exists (select 1 from admin_users where id = auth.uid() and role in ('founder', 'super_admin', 'hr_admin'))
);

create policy bugs_admin_all on bug_reports for all using (
  exists (select 1 from admin_users where id = auth.uid() and role in ('founder', 'super_admin', 'hr_admin'))
);

create policy features_admin_all on feature_requests for all using (
  exists (select 1 from admin_users where id = auth.uid() and role in ('founder', 'super_admin', 'hr_admin'))
);

create policy feedback_admin_all on feedback for all using (
  exists (select 1 from admin_users where id = auth.uid() and role in ('founder', 'super_admin', 'hr_admin'))
);

create policy builds_admin_all on testing_builds for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'super_admin'))
);

create policy bugs_admin_all on bug_reports for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'super_admin'))
);

create policy features_admin_all on feature_requests for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'super_admin'))
);

create policy feedback_admin_all on feedback for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'super_admin'))
);
-- ===========================================
-- Multi-User Admin Auth Migration
-- Date: 2026-06-07
-- ===========================================

-- 1. Admin Users Table
create table if not exists admin_users (
  id uuid references auth.users(id) primary key,
  full_name text not null,
  role text not null default 'viewer' check (role in ('super_admin', 'admin', 'viewer')),
  created_at timestamp with time zone default now()
);

alter table admin_users enable row level security;

create policy "users read own profile" on admin_users for select to authenticated using (auth.uid() = id);

-- 2. Activity Log Table
create table if not exists admin_activity_log (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id),
  user_name text,
  action text not null,
  target_table text,
  target_id text,
  details jsonb,
  created_at timestamp with time zone default now()
);

alter table admin_activity_log enable row level security;

create policy "authenticated can insert logs" on admin_activity_log for insert to authenticated with check (true);
create policy "authenticated can read logs" on admin_activity_log for select to authenticated using (true);

-- =============================================
-- 017_audit_logs.sql
-- Audit trail for important actions across the platform
-- =============================================

create table if not exists audit_logs (
  id uuid default gen_random_uuid() primary key,
  action text not null,
  table_name text not null,
  record_id text,
  old_values jsonb,
  new_values jsonb,
  performed_by uuid references profiles(id),
  created_at timestamptz default now()
);

create index if not exists idx_audit_logs_action on audit_logs(action);
create index if not exists idx_audit_logs_table on audit_logs(table_name);
create index if not exists idx_audit_logs_created on audit_logs(created_at desc);

-- Enable RLS
alter table audit_logs enable row level security;

-- Allow service_role full access (for server-side logging)
create policy audit_service on audit_logs for all using (true);

-- Admin can view all audit logs
create policy audit_admin on audit_logs for select using (
  (select role from profiles where id = auth.uid()) in ('founder', 'super_admin', 'hr_admin')
);


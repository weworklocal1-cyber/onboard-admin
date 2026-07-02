-- Internship applications
create extension if not exists "uuid-ossp";

create table if not exists internship_applications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id),
  full_name text not null,
  email text not null,
  phone text,
  certificate_id text references academy_certificates(certificate_id),
  motivation text,
  resume_url text,
  status text default 'pending' check (status in ('pending', 'reviewed', 'accepted', 'rejected')),
  created_at timestamp with time zone default now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid references profiles(id)
);

create index if not exists idx_internship_applications_user on internship_applications(user_id);
create index if not exists idx_internship_applications_status on internship_applications(status);

alter table internship_applications enable row level security;
create policy "users can read own applications" on internship_applications for select to authenticated using (auth.uid() = user_id);
create policy "users can insert own application" on internship_applications for insert to authenticated with check (auth.uid() = user_id);
create policy "admins can manage applications" on internship_applications for all to authenticated using (
  (select role from profiles where id = auth.uid()) in ('founder', 'super_admin', 'hr_admin')
);

insert into supabase_migrations.schema_migrations (version) values ('20260701_internship_applications');

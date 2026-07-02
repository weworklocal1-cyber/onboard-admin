-- Academy enrollment and progress schema
create extension if not exists "uuid-ossp";

create table if not exists academy_enrollments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) not null,
  course_id uuid references academy_courses(id) on delete cascade not null,
  enrolled_at timestamp with time zone default now() not null,
  completed_at timestamp with time zone,
  status text default 'active' check (status in ('active', 'completed', 'dropped'))
);

create index if not exists idx_academy_enrollments_user on academy_enrollments(user_id);
create index if not exists idx_academy_enrollments_course on academy_enrollments(course_id);
create unique index if not exists idx_academy_enrollments_user_course on academy_enrollments(user_id, course_id);

alter table academy_enrollments enable row level security;
create policy "users can read own enrollments" on academy_enrollments for select to authenticated using (auth.uid() = user_id);
create policy "users can insert own enrollment" on academy_enrollments for insert to authenticated with check (auth.uid() = user_id);
create policy "users can update own enrollment" on academy_enrollments for update to authenticated using (auth.uid() = user_id);

alter table academy_enrollments enable row level security;
create policy "admins can manage enrollments" on academy_enrollments for all to authenticated using (
  (select role from profiles where id = auth.uid()) in ('founder', 'super_admin', 'hr_admin')
);

insert into supabase_migrations.schema_migrations (version) values ('20260701_academy_enrollments');

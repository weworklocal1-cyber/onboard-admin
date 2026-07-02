-- Academy LMS Database Schema
-- WeWorkLocal Academy

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Academy Courses
create table if not exists academy_courses (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  slug text unique not null,
  description text,
  thumbnail_url text,
  duration_minutes integer default 60,
  difficulty text default 'beginner',
  passing_score integer default 70,
  is_published boolean default false,
  created_at timestamp with time zone default now()
);

-- 2. Academy Modules
create table if not exists academy_modules (
  id uuid default uuid_generate_v4() primary key,
  course_id uuid references academy_courses(id) on delete cascade,
  title text not null,
  order_no integer not null,
  created_at timestamp with time zone default now()
);

-- 3. Academy Lessons
create table if not exists academy_lessons (
  id uuid default uuid_generate_v4() primary key,
  module_id uuid references academy_modules(id) on delete cascade,
  title text not null,
  content_md text,
  video_url text,
  duration_minutes integer default 10,
  order_no integer not null,
  created_at timestamp with time zone default now()
);

-- 4. Academy Quizzes
create table if not exists academy_quizzes (
  id uuid default uuid_generate_v4() primary key,
  module_id uuid references academy_modules(id) on delete cascade,
  title text not null default 'Mini Quiz',
  passing_score integer default 70,
  time_limit_minutes integer default 10,
  created_at timestamp with time zone default now()
);

-- 5. Academy Questions
create table if not exists academy_questions (
  id uuid default uuid_generate_v4() primary key,
  quiz_id uuid references academy_quizzes(id) on delete cascade,
  question text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_option text not null check (correct_option in ('a', 'b', 'c', 'd')),
  explanation text,
  difficulty text default 'medium',
  category text,
  tags text[],
  created_at timestamp with time zone default now()
);

-- 6. Academy Attempts
create table if not exists academy_attempts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id),
  course_id uuid references academy_courses(id),
  quiz_id uuid references academy_quizzes(id),
  score integer,
  percentage numeric,
  passed boolean default false,
  started_at timestamp with time zone default now(),
  submitted_at timestamp with time zone
);

-- 7. Academy Answers
create table if not exists academy_answers (
  id uuid default uuid_generate_v4() primary key,
  attempt_id uuid references academy_attempts(id) on delete cascade,
  question_id uuid references academy_questions(id),
  selected_option text,
  is_correct boolean
);

-- 8. Academy Certificates
create table if not exists academy_certificates (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id),
  course_id uuid references academy_courses(id),
  certificate_id text unique not null,
  score numeric,
  issued_at timestamp with time zone default now(),
  qr_code_url text,
  verification_token uuid default uuid_generate_v4(),
  pdf_url text
);

-- 9. Academy Progress
create table if not exists academy_progress (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id),
  lesson_id uuid references academy_lessons(id),
  completed boolean default false,
  completed_at timestamp with time zone
);

-- 10. Academy XP & Gamification
create table if not exists academy_xp (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id),
  points integer default 0,
  streak integer default 0,
  last_activity_date date,
  created_at timestamp with time zone default now()
);

-- 11. Academy Badges
create table if not exists academy_badges (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id),
  badge_key text not null,
  title text not null,
  description text,
  icon text,
  awarded_at timestamp with time zone default now()
);

-- Indexes for performance
create index if not exists idx_academy_courses_slug on academy_courses(slug);
create index if not exists idx_academy_modules_course on academy_modules(course_id);
create index if not exists idx_academy_lessons_module on academy_lessons(module_id);
create index if not exists idx_academy_attempts_user on academy_attempts(user_id);
create index if not exists idx_academy_attempts_course on academy_attempts(course_id);
create index if not exists idx_academy_certificates_user on academy_certificates(user_id);
create index if not exists idx_academy_certificates_token on academy_certificates(verification_token);
create index if not exists idx_academy_progress_user on academy_progress(user_id);

-- Row Level Security
alter table academy_courses enable row level security;
alter table academy_modules enable row level security;
alter table academy_lessons enable row level security;
alter table academy_quizzes enable row level security;
alter table academy_questions enable row level security;
alter table academy_attempts enable row level security;
alter table academy_answers enable row level security;
alter table academy_certificates enable row level security;
alter table academy_progress enable row level security;
alter table academy_xp enable row level security;
alter table academy_badges enable row level security;

-- Public read policies
create policy "public read courses" on academy_courses for select to anon using (is_published = true);
create policy "public read modules" on academy_modules for select to anon using (true);
create policy "public read lessons" on academy_lessons for select to anon using (true);
create policy "public read questions" on academy_questions for select to anon using (true);
create policy "public read quizzes" on academy_quizzes for select to anon using (true);

-- Authenticated policies
create policy "authenticated can read" on academy_attempts for select to authenticated using (true);
create policy "authenticated can insert attempts" on academy_attempts for insert to authenticated with check (true);
create policy "authenticated can read answers" on academy_answers for select to authenticated using (true);
create policy "authenticated can insert answers" on academy_answers for insert to authenticated with check (true);
create policy "users can read own certificates" on academy_certificates for select to authenticated using (auth.uid() = user_id);
create policy "users can read own progress" on academy_progress for select to authenticated using (auth.uid() = user_id);
create policy "users can insert progress" on academy_progress for insert to authenticated with check (true);
create policy "users can update progress" on academy_progress for update to authenticated using (auth.uid() = user_id);
create policy "users can read own xp" on academy_xp for select to authenticated using (auth.uid() = user_id);
create policy "users can read own badges" on academy_badges for select to authenticated using (auth.uid() = user_id);

-- Founder/admin policies
create policy "admins can manage all" on academy_courses for all to authenticated using (
  (select role from profiles where id = auth.uid()) in ('founder', 'super_admin', 'hr_admin')
);
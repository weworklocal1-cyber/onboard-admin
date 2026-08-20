-- Academy RLS Security Fix
-- Remove anonymous read access from private content tables
-- Anonymous users can only read published course public metadata

-- Drop overly permissive anonymous policies
drop policy if exists "public read modules" on academy_modules;
drop policy if exists "public read lessons" on academy_lessons;
drop policy if exists "public read questions" on academy_questions;
drop policy if exists "public read quizzes" on academy_quizzes;

-- Authenticated users can read modules/lessons/quizzes/questions
-- Enrollment-based access is enforced at the application layer via server-side checks
create policy "authenticated read modules" on academy_modules for select to authenticated using (true);
create policy "authenticated read lessons" on academy_lessons for select to authenticated using (true);
create policy "authenticated read quizzes" on academy_quizzes for select to authenticated using (true);
create policy "authenticated read questions" on academy_questions for select to authenticated using (true);

-- Ensure academy_enrollments has proper unique constraint (idempotency)
create unique index if not exists idx_academy_enrollments_user_course on academy_enrollments(user_id, course_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE tablename = 'academy_progress'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'academy_progress_user_lesson_unique'
    ) THEN
      ALTER TABLE academy_progress ADD CONSTRAINT academy_progress_user_lesson_unique UNIQUE (user_id, lesson_id);
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE tablename = 'academy_answers'
  ) THEN
    create index if not exists idx_academy_answers_attempt_id on academy_answers(attempt_id);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'public read modules'
  ) THEN
    drop policy if exists "public read modules" on academy_modules;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'public read lessons'
  ) THEN
    drop policy if exists "public read lessons" on academy_lessons;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'public read questions'
  ) THEN
    drop policy if exists "public read questions" on academy_questions;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'public read quizzes'
  ) THEN
    drop policy if exists "public read quizzes" on academy_quizzes;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'authenticated can read modules'
  ) THEN
    drop policy if exists "authenticated can read modules" on academy_modules;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'authenticated can read lessons'
  ) THEN
    drop policy if exists "authenticated can read lessons" on academy_lessons;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'authenticated can read questions'
  ) THEN
    drop policy if exists "authenticated can read questions" on academy_questions;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'authenticated can read quizzes'
  ) THEN
    drop policy if exists "authenticated can read quizzes" on academy_quizzes;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE tablename = 'academy_modules'
  ) THEN
    create policy "authenticated can read modules" on academy_modules for select to authenticated using (true);
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE tablename = 'academy_lessons'
  ) THEN
    create policy "authenticated can read lessons" on academy_lessons for select to authenticated using (true);
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE tablename = 'academy_questions'
  ) THEN
    create policy "authenticated can read questions" on academy_questions for select to authenticated using (true);
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE tablename = 'academy_quizzes'
  ) THEN
    create policy "authenticated can read quizzes" on academy_quizzes for select to authenticated using (true);
  END IF;
END $$;

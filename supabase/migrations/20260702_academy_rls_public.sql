DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE tablename = 'academy_modules'
  ) THEN
    create policy "public read modules" on academy_modules for select to anon using (true);
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE tablename = 'academy_lessons'
  ) THEN
    create policy "public read lessons" on academy_lessons for select to anon using (true);
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE tablename = 'academy_questions'
  ) THEN
    create policy "public read questions" on academy_questions for select to anon using (true);
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE tablename = 'academy_quizzes'
  ) THEN
    create policy "public read quizzes" on academy_quizzes for select to anon using (true);
  END IF;
END $$;

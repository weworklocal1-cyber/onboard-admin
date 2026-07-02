DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'academy_courses') THEN
    DROP POLICY IF EXISTS "admins can manage all" ON academy_courses;
    CREATE POLICY "admins can manage academy" ON academy_courses FOR ALL TO authenticated USING (
      (SELECT role FROM admin_users WHERE id = auth.uid()) IN ('founder', 'super_admin', 'hr_admin')
    );
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'academy_modules') THEN
    DROP POLICY IF EXISTS "public read modules" ON academy_modules;
    CREATE POLICY "public read modules" ON academy_modules FOR SELECT TO anon, authenticated USING (true);
    CREATE POLICY "admins can manage modules" ON academy_modules FOR ALL TO authenticated USING (
      (SELECT role FROM admin_users WHERE id = auth.uid()) IN ('founder', 'super_admin', 'hr_admin')
    );
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'academy_lessons') THEN
    DROP POLICY IF EXISTS "public read lessons" ON academy_lessons;
    CREATE POLICY "public read lessons" ON academy_lessons FOR SELECT TO anon, authenticated USING (true);
    CREATE POLICY "admins can manage lessons" ON academy_lessons FOR ALL TO authenticated USING (
      (SELECT role FROM admin_users WHERE id = auth.uid()) IN ('founder', 'super_admin', 'hr_admin')
    );
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'academy_quizzes') THEN
    DROP POLICY IF EXISTS "public read quizzes" ON academy_quizzes;
    CREATE POLICY "public read quizzes" ON academy_quizzes FOR SELECT TO anon, authenticated USING (true);
    CREATE POLICY "admins can manage quizzes" ON academy_quizzes FOR ALL TO authenticated USING (
      (SELECT role FROM admin_users WHERE id = auth.uid()) IN ('founder', 'super_admin', 'hr_admin')
    );
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'academy_questions') THEN
    DROP POLICY IF EXISTS "public read questions" ON academy_questions;
    CREATE POLICY "public read questions" ON academy_questions FOR SELECT TO anon, authenticated USING (true);
    CREATE POLICY "admins can manage questions" ON academy_questions FOR ALL TO authenticated USING (
      (SELECT role FROM admin_users WHERE id = auth.uid()) IN ('founder', 'super_admin', 'hr_admin')
    );
  END IF;
END $$;

ALTER TABLE academy_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated can read" ON academy_attempts;
DROP POLICY IF EXISTS "authenticated can insert attempts" ON academy_attempts;
DROP POLICY IF EXISTS "users can update own attempts" ON academy_attempts;

CREATE POLICY "authenticated can read" ON academy_attempts FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated can insert attempts" ON academy_attempts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "users can update own attempts" ON academy_attempts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users can delete own attempts" ON academy_attempts FOR DELETE TO authenticated USING (auth.uid() = user_id);
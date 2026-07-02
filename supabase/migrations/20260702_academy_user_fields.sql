DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'academy_xp') THEN
    ALTER TABLE academy_xp ADD COLUMN IF NOT EXISTS user_name TEXT;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'academy_certificates') THEN
    ALTER TABLE academy_certificates ADD COLUMN IF NOT EXISTS user_name TEXT;
    ALTER TABLE academy_certificates ADD COLUMN IF NOT EXISTS user_email TEXT;
  END IF;
END $$;

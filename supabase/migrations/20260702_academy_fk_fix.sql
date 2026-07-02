-- Fix foreign key constraints to point to auth.users instead of profiles
-- Academy users don't have profile rows, so FKs must reference auth.users

-- academy_certificates.user_id -> auth.users
ALTER TABLE IF EXISTS academy_certificates DROP CONSTRAINT IF EXISTS academy_certificates_user_id_fkey;
ALTER TABLE academy_certificates ADD CONSTRAINT academy_certificates_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- academy_enrollments.user_id -> auth.users
ALTER TABLE IF EXISTS academy_enrollments DROP CONSTRAINT IF EXISTS academy_enrollments_user_id_fkey;
ALTER TABLE academy_enrollments ADD CONSTRAINT academy_enrollments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- academy_attempts.user_id -> auth.users
ALTER TABLE IF EXISTS academy_attempts DROP CONSTRAINT IF EXISTS academy_attempts_user_id_fkey;
ALTER TABLE academy_attempts ADD CONSTRAINT academy_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- academy_progress.user_id -> auth.users
ALTER TABLE IF EXISTS academy_progress DROP CONSTRAINT IF EXISTS academy_progress_user_id_fkey;
ALTER TABLE academy_progress ADD CONSTRAINT academy_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- academy_xp.user_id -> auth.users
ALTER TABLE IF EXISTS academy_xp DROP CONSTRAINT IF EXISTS academy_xp_user_id_fkey;
ALTER TABLE academy_xp ADD CONSTRAINT academy_xp_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- academy_badges.user_id -> auth.users
ALTER TABLE IF EXISTS academy_badges DROP CONSTRAINT IF EXISTS academy_badges_user_id_fkey;
ALTER TABLE academy_badges ADD CONSTRAINT academy_badges_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

DO $$ BEGIN
  RAISE NOTICE 'Academy FK constraints updated to reference auth.users';
END $$;

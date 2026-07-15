-- Fix internship_applications foreign key to point to auth.users instead of profiles
-- Academy users don't have profile rows, so FK must reference auth.users

ALTER TABLE IF EXISTS internship_applications DROP CONSTRAINT IF EXISTS internship_applications_user_id_fkey;
ALTER TABLE internship_applications ADD CONSTRAINT internship_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

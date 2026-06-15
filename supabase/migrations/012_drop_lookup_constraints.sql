-- Drop only enum-style CHECK constraints that list literal values.
-- Keep NOT NULL, UNIQUE, REFERENCES, and PRIMARY KEY constraints intact.
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_department_check;
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_employment_type_check;
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE IF EXISTS public.hr_documents DROP CONSTRAINT IF EXISTS hr_documents_document_type_check;

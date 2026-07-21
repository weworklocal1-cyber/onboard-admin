-- Migration 025: Medical Certificate for Sick Leaves
-- Run this in your Supabase dashboard SQL editor or via Supabase CLI

-- Add medical_certificate_url to leave_requests
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS medical_certificate_url TEXT;

-- Create storage bucket for medical certificates if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'medical_certificates',
  'medical_certificates',
  FALSE,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "employee_upload_medical_certificate" ON storage.objects;
DROP POLICY IF EXISTS "employee_view_medical_certificate" ON storage.objects;
DROP POLICY IF EXISTS "hr_view_medical_certificate" ON storage.objects;

-- Storage policies for medical certificates bucket
-- Employee can upload their own
CREATE POLICY "employee_upload_medical_certificate"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'medical_certificates'
    AND auth.uid()::text = (storage.objects.metadata->>'employee_id')::text
  );

-- Employee can view their own
CREATE POLICY "employee_view_medical_certificate"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'medical_certificates'
    AND auth.uid()::text = (storage.objects.metadata->>'employee_id')::text
  );

-- HR Admin and above can view all
CREATE POLICY "hr_view_medical_certificate"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'medical_certificates'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('founder', 'super_admin', 'hr_admin')
    )
  );

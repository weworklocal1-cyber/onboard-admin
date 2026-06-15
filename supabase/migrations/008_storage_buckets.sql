-- =============================================
-- 008_storage_buckets.sql
-- LocalWala Workforce Hub - Storage for HR documents
-- =============================================

-- Create storage bucket for HR documents (private, signed URLs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hr_documents',
  'hr_documents',
  FALSE,
  10485760,
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for HR documents bucket
CREATE POLICY "authenticated_access_hr_documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'hr_documents'
    AND (
      -- HR admin can access any document
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('founder', 'super_admin', 'hr_admin'))
      -- Employee can access their own documents
      OR owner = auth.uid()
    )
  );

CREATE POLICY "hr_admin_insert_hr_documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'hr_documents'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('founder', 'super_admin', 'hr_admin'))
  );

CREATE POLICY "hr_admin_delete_hr_documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'hr_documents'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('founder', 'super_admin', 'hr_admin'))
  );
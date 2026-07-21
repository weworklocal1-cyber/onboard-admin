-- Migration 022: Task Attachments Storage Bucket
-- Run this in your Supabase dashboard SQL editor or via Supabase CLI

-- Create storage bucket for task attachments (private, signed URLs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task_attachments',
  'task_attachments',
  FALSE,
  52428800,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for task attachments bucket
-- Task creator, assignee, and admins can view
CREATE POLICY "task_attachments_view"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'task_attachments'
    AND (
      EXISTS (
        SELECT 1 FROM tasks
        WHERE tasks.id = (storage.objects.metadata->>'task_id')::uuid
        AND (tasks.created_by = auth.uid() OR tasks.assigned_to = auth.uid())
      )
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('founder', 'super_admin', 'hr_admin', 'team_lead')
      )
    )
  );

-- Authenticated users with task access can upload
CREATE POLICY "task_attachments_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'task_attachments'
    AND (
      EXISTS (
        SELECT 1 FROM tasks
        WHERE tasks.id = (storage.objects.metadata->>'task_id')::uuid
        AND (tasks.created_by = auth.uid() OR tasks.assigned_to = auth.uid())
      )
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('founder', 'super_admin', 'hr_admin', 'team_lead')
      )
    )
  );

-- Task creator, assignee, and admins can delete
CREATE POLICY "task_attachments_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'task_attachments'
    AND (
      EXISTS (
        SELECT 1 FROM tasks
        WHERE tasks.id = (storage.objects.metadata->>'task_id')::uuid
        AND (tasks.created_by = auth.uid() OR tasks.assigned_to = auth.uid())
      )
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('founder', 'super_admin', 'hr_admin', 'team_lead')
      )
    )
  );

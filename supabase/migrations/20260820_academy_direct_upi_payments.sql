-- Add direct UPI payment support to academy_orders
ALTER TABLE academy_orders
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'razorpay',
  ADD COLUMN IF NOT EXISTS upi_id TEXT,
  ADD COLUMN IF NOT EXISTS transaction_note TEXT,
  ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
  ADD COLUMN IF NOT EXISTS admin_note TEXT;

-- Create storage bucket for payment proofs if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('payment-proofs', 'payment-proofs', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage policy for payment proofs
DROP POLICY IF EXISTS "Public uploads are insert-only" ON storage.objects;
CREATE POLICY "Public uploads are insert-only" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'payment-proofs');

DROP POLICY IF EXISTS "Public updates are disabled" ON storage.objects;
CREATE POLICY "Public updates are disabled" ON storage.objects
  FOR UPDATE USING (false);

DROP POLICY IF EXISTS "Public deletes are disabled" ON storage.objects;
CREATE POLICY "Public deletes are disabled" ON storage.objects
  FOR DELETE USING (false);

-- Seed default academy settings
INSERT INTO settings (key, value, type, is_secret) VALUES
  ('academy_payment_gateway', 'razorpay', 'text', false),
  ('academy_razorpay_key_id', '', 'secret', true),
  ('academy_razorpay_key_secret', '', 'secret', true),
  ('academy_razorpay_webhook_secret', '', 'secret', true),
  ('academy_payment_enabled', 'true', 'text', false),
  ('academy_gst_rate', '18', 'text', false),
  ('academy_gst_enabled', 'true', 'text', false),
  ('academy_gst_inclusive', 'false', 'text', false),
  ('academy_gst_tin_number', '', 'text', false),
  ('academy_gst_company_name', '', 'text', false)
ON CONFLICT (key) DO NOTHING;

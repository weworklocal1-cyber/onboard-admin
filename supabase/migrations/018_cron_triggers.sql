-- =============================================
-- 018_cron_triggers.sql
-- Scheduled cron jobs for Edge Functions
-- =============================================

-- Enable pg_cron extension
create extension if not exists pg_cron;

-- Attendance reminder: Daily at 10:30 AM IST (05:00 UTC)
select cron.schedule(
  'attendance-reminder',
  '0 5 * * *',
  select net.http_post('https://<PROJECT_REF>.supabase.co/functions/v1/attendance-reminder', '{}', 'content-type: application/json', 'supabase-service-key')
);

-- Checkout reminder: Daily at 7:30 PM IST (14:00 UTC)
select cron.schedule(
  'checkout-reminder',
  '0 14 * * *',
  select net.http_post('https://<PROJECT_REF>.supabase.co/functions/v1/checkout-reminder', '{}', 'content-type: application/json', 'supabase-service-key')
);

-- EOD update reminder: Every 3 hours from 8-10 PM IST
select cron.schedule(
  'eod-reminder-8pm',
  '0 14 * * *',
  select net.http_post('https://<PROJECT_REF>.supabase.co/functions/v1/eod-reminder', '{}', 'content-type: application/json', 'supabase-service-key')
);

select cron.schedule(
  'eod-reminder-9pm',
  '0 15 * * *',
  select net.http_post('https://<PROJECT_REF>.supabase.co/functions/v1/eod-reminder', '{}', 'content-type: application/json', 'supabase-service-key')
);

select cron.schedule(
  'eod-reminder-10pm',
  '0 16 * * *',
  select net.http_post('https://<PROJECT_REF>.supabase.co/functions/v1/eod-reminder', '{}', 'content-type: application/json', 'supabase-service-key')
);

-- Follow-up reminder: Every 15 minutes
select cron.schedule(
  'follow-up-reminder',
  '*/15 * * * *',
  select net.http_post('https://<PROJECT_REF>.supabase.co/functions/v1/follow-up-reminder', '{}', 'content-type: application/json', 'supabase-service-key')
);

-- Overdue tasks: Every hour
select cron.schedule(
  'overdue-tasks',
  '0 * * * *',
  select net.http_post('https://<PROJECT_REF>.supabase.co/functions/v1/overdue-tasks', '{}', 'content-type: application/json', 'supabase-service-key')
);

-- NOTE: Replace <PROJECT_REF> and set supabase-service-key with your SERVICE_ROLE_KEY

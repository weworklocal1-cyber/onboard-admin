-- =============================================
-- 006_notifications.sql
-- LocalWala Workforce Hub - Notifications + Audit
-- =============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN (
    'attendance_reminder', 'checkout_reminder', 'update_reminder',
    'follow_up_reminder', 'task_assigned', 'task_updated', 'task_overdue',
    'blocker_flagged', 'restaurant_status_changed', 'campaign_assigned', 'general'
  )),
  title TEXT NOT NULL,
  message TEXT,
  data JSONB,          -- {restaurant_id, task_id, etc.}
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(recipient_id, read) WHERE read = FALSE;

-- Audit log (immutable — no update/delete allowed via RLS)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL,          -- 'CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'LOGIN'
  resource_type TEXT NOT NULL,   -- 'restaurant', 'employee', 'task', 'attendance'
  resource_id UUID,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- =============================================
-- 002_attendance.sql
-- LocalWala Workforce Hub - Attendance System
-- =============================================

CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  check_in_lat DECIMAL(10,7),
  check_in_lng DECIMAL(10,7),
  check_out_lat DECIMAL(10,7),
  check_out_lng DECIMAL(10,7),
  -- Working hours auto-calculated
  working_hours DECIMAL(4,2) GENERATED ALWAYS AS (
    CASE
      WHEN check_in_time IS NOT NULL AND check_out_time IS NOT NULL
      THEN ROUND(EXTRACT(EPOCH FROM (check_out_time - check_in_time)) / 3600.0, 2)
      ELSE NULL
    END
  ) STORED,
  status TEXT DEFAULT 'absent' CHECK (status IN (
    'present', 'absent', 'half_day', 'late', 'wfh', 'on_leave'
  )),
  is_late BOOLEAN DEFAULT FALSE,
  wfh_approved BOOLEAN DEFAULT FALSE,
  notes TEXT,
  -- Admin override fields
  override_by UUID REFERENCES profiles(id),
  override_reason TEXT,
  override_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- One record per employee per day
  UNIQUE(employee_id, date)
);

CREATE TRIGGER attendance_updated_at
  BEFORE UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);

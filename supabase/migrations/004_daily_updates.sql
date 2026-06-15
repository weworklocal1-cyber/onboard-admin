-- =============================================
-- 004_daily_updates.sql
-- LocalWala Workforce Hub - EOD Updates
-- =============================================

CREATE TABLE IF NOT EXISTS daily_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_today TEXT NOT NULL,
  plan_for_tomorrow TEXT NOT NULL,
  blockers TEXT,
  has_blocker BOOLEAN DEFAULT FALSE,
  blocker_resolved BOOLEAN DEFAULT FALSE,
  blocker_resolved_at TIMESTAMPTZ,
  -- Mood tracking (optional)
  mood TEXT CHECK (mood IN ('terrible', 'bad', 'neutral', 'good', 'great')),
  -- Role-specific optional fields
  github_links TEXT,        -- Developer: PR/commit links
  ticket_count INTEGER,     -- Support: tickets handled today
  restaurants_visited INTEGER, -- Onboarding exec: visits today
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  -- One submission per employee per day
  UNIQUE(employee_id, date)
);

-- Team Lead comments on daily updates
CREATE TABLE IF NOT EXISTS daily_update_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id UUID NOT NULL REFERENCES daily_updates(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_updates_employee_date ON daily_updates(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_updates_date ON daily_updates(date);
CREATE INDEX IF NOT EXISTS idx_daily_updates_has_blocker ON daily_updates(has_blocker) WHERE has_blocker = TRUE;

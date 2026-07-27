-- =============================================
-- Performance Reviews / Appraisals
-- =============================================

CREATE TABLE IF NOT EXISTS performance_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  review_period_start date NOT NULL,
  review_period_end date NOT NULL,
  rating numeric(3, 2) CHECK (rating >= 1 AND rating <= 5),
  strengths text,
  areas_for_improvement text,
  goals text,
  overall_comments text,
  status text NOT NULL DEFAULT 'draft',
  submitted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_performance_reviews_employee ON performance_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_reviewer ON performance_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_status ON performance_reviews(status);

ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employees_read_own_reviews"
  ON performance_reviews FOR SELECT
  USING (
    employee_id = auth.uid()
    OR reviewer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('founder', 'super_admin', 'hr_admin', 'team_lead'))
  );

CREATE POLICY "reviewers_insert_reviews"
  ON performance_reviews FOR INSERT
  WITH CHECK (
    reviewer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('founder', 'super_admin', 'hr_admin', 'team_lead'))
  );

CREATE POLICY "reviewers_update_reviews"
  ON performance_reviews FOR UPDATE
  USING (
    reviewer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('founder', 'super_admin', 'hr_admin', 'team_lead'))
  );

CREATE POLICY "admins_delete_reviews"
  ON performance_reviews FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('founder', 'super_admin', 'hr_admin'))
  );

CREATE OR REPLACE FUNCTION set_performance_reviews_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_performance_reviews_updated_at ON performance_reviews;
CREATE TRIGGER trigger_performance_reviews_updated_at BEFORE UPDATE ON performance_reviews FOR EACH ROW EXECUTE PROCEDURE set_performance_reviews_updated_at();

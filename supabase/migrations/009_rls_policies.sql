-- =============================================
-- 007_rls_policies.sql
-- LocalWala Workforce Hub - Row Level Security
-- =============================================

-- Helper function: get current user's role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: get current user's department
CREATE OR REPLACE FUNCTION get_my_department()
RETURNS TEXT AS $$
  SELECT department FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: is current user an admin-level role?
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT role IN ('founder', 'super_admin', 'hr_admin')
  FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: is current user a team lead or above?
CREATE OR REPLACE FUNCTION is_lead_or_above()
RETURNS BOOLEAN AS $$
  SELECT role IN ('founder', 'super_admin', 'hr_admin', 'team_lead')
  FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================
-- PROFILES RLS
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Admins see everyone
CREATE POLICY "admin_read_all_profiles"
  ON profiles FOR SELECT
  USING (is_admin());

-- Team leads see their own department
CREATE POLICY "team_lead_read_department_profiles"
  ON profiles FOR SELECT
  USING (
    get_my_role() = 'team_lead'
    AND department = get_my_department()
  );

-- Everyone sees own profile
CREATE POLICY "read_own_profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

-- Only admins can create profiles (new employees)
CREATE POLICY "admin_insert_profiles"
  ON profiles FOR INSERT
  WITH CHECK (is_admin());

-- Admins can update any profile; employees update own (limited)
CREATE POLICY "admin_update_profiles"
  ON profiles FOR UPDATE
  USING (is_admin());

CREATE POLICY "employee_update_own_profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- =============================================
-- ATTENDANCE RLS
-- =============================================
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Employees read own attendance
CREATE POLICY "read_own_attendance"
  ON attendance FOR SELECT
  USING (employee_id = auth.uid());

-- Leads and above read all attendance
CREATE POLICY "lead_read_all_attendance"
  ON attendance FOR SELECT
  USING (is_lead_or_above());

-- Employees create own attendance (check-in/out)
CREATE POLICY "insert_own_attendance"
  ON attendance FOR INSERT
  WITH CHECK (employee_id = auth.uid());

-- Employees update own attendance (check-out)
CREATE POLICY "update_own_attendance"
  ON attendance FOR UPDATE
  USING (employee_id = auth.uid());

-- Admins can override any attendance record
CREATE POLICY "admin_update_any_attendance"
  ON attendance FOR UPDATE
  USING (is_admin());

-- =============================================
-- TASKS RLS
-- =============================================
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Admins and leads see all tasks
CREATE POLICY "lead_read_all_tasks"
  ON tasks FOR SELECT
  USING (is_lead_or_above());

-- Assignee and creator see their tasks
CREATE POLICY "read_own_tasks"
  ON tasks FOR SELECT
  USING (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
  );

-- Leads and above create tasks
CREATE POLICY "lead_create_tasks"
  ON tasks FOR INSERT
  WITH CHECK (is_lead_or_above());

-- Assignee updates own task status; leads update any
CREATE POLICY "assignee_update_task"
  ON tasks FOR UPDATE
  USING (assigned_to = auth.uid() OR is_lead_or_above());

-- =============================================
-- DAILY UPDATES RLS
-- =============================================
ALTER TABLE daily_updates ENABLE ROW LEVEL SECURITY;

-- Everyone reads own updates
CREATE POLICY "read_own_updates"
  ON daily_updates FOR SELECT
  USING (employee_id = auth.uid());

-- Leads and above read team updates
CREATE POLICY "lead_read_all_updates"
  ON daily_updates FOR SELECT
  USING (is_lead_or_above());

-- Employees insert own updates
CREATE POLICY "insert_own_update"
  ON daily_updates FOR INSERT
  WITH CHECK (employee_id = auth.uid());

-- Employees update own update (same day edit)
CREATE POLICY "update_own_update"
  ON daily_updates FOR UPDATE
  USING (employee_id = auth.uid());

-- =============================================
-- RESTAURANTS RLS
-- =============================================
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

-- Admins and leads see all restaurants
CREATE POLICY "lead_read_all_restaurants"
  ON restaurants FOR SELECT
  USING (is_lead_or_above());

-- Onboarding exec sees assigned restaurants only
CREATE POLICY "exec_read_assigned_restaurants"
  ON restaurants FOR SELECT
  USING (assigned_executive_id = auth.uid());

-- Onboarding exec and leads can create restaurants
CREATE POLICY "exec_create_restaurant"
  ON restaurants FOR INSERT
  WITH CHECK (
    get_my_role() IN ('onboarding_executive', 'team_lead', 'hr_admin', 'super_admin', 'founder')
  );

-- Exec updates own assigned restaurants; admins update any
CREATE POLICY "exec_update_assigned_restaurant"
  ON restaurants FOR UPDATE
  USING (
    assigned_executive_id = auth.uid()
    OR is_lead_or_above()
  );

-- =============================================
-- RESTAURANT INTERACTIONS RLS
-- =============================================
ALTER TABLE restaurant_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exec_read_own_interactions"
  ON restaurant_interactions FOR SELECT
  USING (executive_id = auth.uid() OR is_lead_or_above());

CREATE POLICY "exec_insert_interactions"
  ON restaurant_interactions FOR INSERT
  WITH CHECK (executive_id = auth.uid());

-- =============================================
-- FOLLOW UPS RLS
-- =============================================
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exec_read_own_followups"
  ON follow_ups FOR SELECT
  USING (assigned_to = auth.uid() OR is_lead_or_above());

CREATE POLICY "exec_manage_followups"
  ON follow_ups FOR ALL
  USING (assigned_to = auth.uid() OR is_lead_or_above());

-- =============================================
-- NOTIFICATIONS RLS
-- =============================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_own_notifications"
  ON notifications FOR SELECT
  USING (recipient_id = auth.uid());

CREATE POLICY "update_own_notifications"
  ON notifications FOR UPDATE
  USING (recipient_id = auth.uid());

-- System/service role inserts notifications (via edge functions)
CREATE POLICY "service_insert_notifications"
  ON notifications FOR INSERT
  WITH CHECK (TRUE);  -- Edge functions use service role key

-- =============================================
-- AUDIT LOGS RLS (read-only for admins)
-- =============================================
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_audit_logs"
  ON audit_logs FOR SELECT
  USING (is_admin());

-- Anyone can insert (logged server-side)
CREATE POLICY "insert_audit_logs"
  ON audit_logs FOR INSERT
  WITH CHECK (TRUE);

-- NO update or delete policies on audit_logs (immutable)

-- =============================================
-- HR DOCUMENTS RLS
-- =============================================
ALTER TABLE hr_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_own_hr_documents"
  ON hr_documents FOR SELECT
  USING (employee_id = auth.uid() OR is_admin());

CREATE POLICY "admin_upload_hr_documents"
  ON hr_documents FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "admin_update_hr_documents"
  ON hr_documents FOR UPDATE
  USING (is_admin());

CREATE POLICY "admin_delete_hr_documents"
  ON hr_documents FOR DELETE
  USING (is_admin());

-- =============================================
-- INFLUENCERS RLS
-- =============================================
ALTER TABLE influencers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_all_influencers"
  ON influencers FOR SELECT
  USING (is_admin() OR get_my_role() = 'marketing_executive');

CREATE POLICY "admin_manage_influencers"
  ON influencers FOR ALL
  USING (is_admin());

CREATE POLICY "exec_manage_influencers"
  ON influencers FOR ALL
  USING (auth.uid() = assigned_executive_id OR get_my_role() = 'marketing_executive');

-- =============================================
-- MARKETING CAMPAIGNS RLS
-- =============================================
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_all_campaigns"
  ON marketing_campaigns FOR SELECT
  USING (is_admin() OR get_my_role() IN ('founder', 'marketing_executive'));

CREATE POLICY "create_campaigns"
  ON marketing_campaigns FOR INSERT
  WITH CHECK (is_admin() OR get_my_role() IN ('founder', 'marketing_executive'));

CREATE POLICY "update_campaigns"
  ON marketing_campaigns FOR UPDATE
  USING (is_admin() OR created_by = auth.uid());

-- =============================================
-- CAMPAIGN ASSIGNMENTS RLS
-- =============================================
ALTER TABLE campaign_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_all_assignments"
  ON campaign_assignments FOR SELECT
  USING (is_admin() OR is_lead_or_above() OR assigned_by = auth.uid());

CREATE POLICY "create_assignments"
  ON campaign_assignments FOR INSERT
  WITH CHECK (is_admin() OR get_my_role() IN ('founder', 'marketing_executive'));

CREATE POLICY "update_assignments"
  ON campaign_assignments FOR UPDATE
  USING (is_admin() OR assigned_by = auth.uid());

-- =============================================
-- 016_seed_permission_rules.sql
-- LocalWala Workforce Hub - Default Permission Rules
-- =============================================

CREATE OR REPLACE FUNCTION seed_permission_rules()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO permission_rules (group_name, role_names, description) VALUES
    ('ADMIN_ROLES', ARRAY['founder', 'super_admin', 'hr_admin'], 'Roles with full platform access'),
    ('LEAD_AND_ABOVE', ARRAY['founder', 'super_admin', 'hr_admin', 'team_lead'], 'Leadership and above'),
    ('HR_ROLES', ARRAY['founder', 'super_admin', 'hr_admin'], 'HR-full roles'),
    ('CAN_MANAGE_RESTAURANTS', ARRAY['founder', 'super_admin', 'hr_admin', 'team_lead', 'onboarding_executive'], 'Restaurant CRM access'),
    ('CAN_MANAGE_CAMPAIGNS', ARRAY['founder', 'super_admin', 'marketing_executive'], 'Marketing campaign access')
  ON CONFLICT (group_name) DO NOTHING;
END;
$$;

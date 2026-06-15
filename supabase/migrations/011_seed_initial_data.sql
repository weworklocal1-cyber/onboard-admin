-- =============================================
-- 011_seed_initial_data.sql
-- LocalWala Workforce Hub - Initial Lookup Data
-- =============================================

CREATE OR REPLACE FUNCTION seed_roles_departments()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO departments (name, description) VALUES
    ('leadership', 'Executive and leadership team'),
    ('engineering', 'Product and software development'),
    ('marketing', 'Marketing, branding, and growth'),
    ('operations', 'Operations and delivery management'),
    ('hr', 'Human resources and people operations'),
    ('sales', 'Sales and business development'),
    ('support', 'Customer support and success'),
    ('finance', 'Finance and accounting'),
    ('field', 'Field operations and on-ground teams')
  ON CONFLICT (name) DO NOTHING;

  INSERT INTO roles (name, label, description) VALUES
    ('founder', 'Founder', 'Company founder with full access'),
    ('super_admin', 'Super Admin', 'Platform administrator with full access'),
    ('hr_admin', 'HR Admin', 'Human resources administrator'),
    ('team_lead', 'Team Lead', 'Department team lead'),
    ('employee', 'Employee', 'General employee'),
    ('developer', 'Developer', 'Software developer'),
    ('support_executive', 'Support Executive', 'Customer support executive'),
    ('marketing_executive', 'Marketing Executive', 'Marketing team member'),
    ('influencer', 'Influencer', 'Brand influencer/ambassador'),
    ('onboarding_executive', 'Onboarding Executive', 'Restaurant onboarding executive'),
    ('intern', 'Intern', 'Intern'),
    ('freelancer', 'Freelancer', 'Freelancer/contractor')
  ON CONFLICT (name) DO NOTHING;

  INSERT INTO department_roles (department_id, role_id)
  SELECT d.id, r.id
  FROM departments d
  JOIN roles r ON r.name IN (
    'founder', 'super_admin'
  )
  WHERE d.name = 'leadership'
  ON CONFLICT DO NOTHING;

  INSERT INTO department_roles (department_id, role_id)
  SELECT d.id, r.id
  FROM departments d
  JOIN roles r ON r.name IN (
    'developer', 'team_lead', 'employee'
  )
  WHERE d.name = 'engineering'
  ON CONFLICT DO NOTHING;

  INSERT INTO department_roles (department_id, role_id)
  SELECT d.id, r.id
  FROM departments d
  JOIN roles r ON r.name IN (
    'marketing_executive', 'team_lead', 'employee', 'influencer'
  )
  WHERE d.name = 'marketing'
  ON CONFLICT DO NOTHING;

  INSERT INTO department_roles (department_id, role_id)
  SELECT d.id, r.id
  FROM departments d
  JOIN roles r ON r.name IN (
    'onboarding_executive', 'employee'
  )
  WHERE d.name = 'operations'
  ON CONFLICT DO NOTHING;

  INSERT INTO department_roles (department_id, role_id)
  SELECT d.id, r.id
  FROM departments d
  JOIN roles r ON r.name IN (
    'hr_admin', 'employee'
  )
  WHERE d.name = 'hr'
  ON CONFLICT DO NOTHING;

  INSERT INTO department_roles (department_id, role_id)
  SELECT d.id, r.id
  FROM departments d
  JOIN roles r ON r.name IN (
    'employee', 'freelancer'
  )
  WHERE d.name = 'sales'
  ON CONFLICT DO NOTHING;

  INSERT INTO department_roles (department_id, role_id)
  SELECT d.id, r.id
  FROM departments d
  JOIN roles r ON r.name IN (
    'support_executive', 'employee'
  )
  WHERE d.name = 'support'
  ON CONFLICT DO NOTHING;

  INSERT INTO department_roles (department_id, role_id)
  SELECT d.id, r.id
  FROM departments d
  JOIN roles r ON r.name IN ('employee')
  WHERE d.name = 'finance'
  ON CONFLICT DO NOTHING;

  INSERT INTO department_roles (department_id, role_id)
  SELECT d.id, r.id
  FROM departments d
  JOIN roles r ON r.name IN ('employee', 'freelancer')
  WHERE d.name = 'field'
  ON CONFLICT DO NOTHING;
END;
$$;

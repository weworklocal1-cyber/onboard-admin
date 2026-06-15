-- Seed permission rules (crucial for founder access to all modules)
INSERT INTO permission_rules (group_name, role_names) VALUES
  ('ADMIN_ROLES', ARRAY['founder', 'super_admin', 'hr_admin']),
  ('LEAD_AND_ABOVE', ARRAY['founder', 'super_admin', 'hr_admin', 'team_lead']),
  ('HR_ROLES', ARRAY['founder', 'super_admin', 'hr_admin']),
  ('CAN_MANAGE_RESTAURANTS', ARRAY['founder', 'super_admin', 'hr_admin', 'team_lead', 'onboarding_executive']),
  ('CAN_MANAGE_CAMPAIGNS', ARRAY['founder', 'super_admin', 'marketing_executive'])
ON CONFLICT (group_name) DO NOTHING;

-- Seed departments
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

-- Seed roles
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

-- Seed employment types
INSERT INTO employment_types (name, label, description) VALUES
  ('full_time', 'Full Time', 'Standard full-time employment'),
  ('part_time', 'Part Time', 'Part-time employment'),
  ('intern', 'Intern', 'Internship position'),
  ('freelancer', 'Freelancer', 'Freelance/contract basis'),
  ('consultant', 'Consultant', 'Consultant role'),
  ('contract', 'Contract', 'Contract employment'),
  ('probationary', 'Probationary', 'Probationary period employee')
ON CONFLICT (name) DO NOTHING;

-- Seed department_roles (links roles to departments)
INSERT INTO department_roles (department_id, role_id)
SELECT d.id, r.id FROM departments d
CROSS JOIN roles r
WHERE (d.name = 'leadership' AND r.name IN ('founder', 'super_admin'))
   OR (d.name = 'engineering' AND r.name IN ('developer', 'team_lead', 'employee'))
   OR (d.name = 'marketing' AND r.name IN ('marketing_executive', 'team_lead', 'employee', 'influencer'))
   OR (d.name = 'operations' AND r.name IN ('onboarding_executive', 'employee'))
   OR (d.name = 'hr' AND r.name IN ('hr_admin', 'employee'))
   OR (d.name = 'sales' AND r.name IN ('employee', 'freelancer'))
   OR (d.name = 'support' AND r.name IN ('support_executive', 'employee'))
   OR (d.name = 'finance' AND r.name IN ('employee'))
   OR (d.name = 'field' AND r.name IN ('employee', 'freelancer'))
ON CONFLICT DO NOTHING;
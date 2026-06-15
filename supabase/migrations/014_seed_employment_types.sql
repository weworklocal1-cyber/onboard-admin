CREATE OR REPLACE FUNCTION seed_employment_types()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO employment_types (name, label, description) VALUES
    ('full_time', 'Full Time', 'Standard full-time employment'),
    ('part_time', 'Part Time', 'Part-time employment'),
    ('intern', 'Intern', 'Internship position'),
    ('freelancer', 'Freelancer', 'Freelance/contract basis'),
    ('consultant', 'Consultant', 'Consultant role'),
    ('contract', 'Contract', 'Contract employment'),
    ('probationary', 'Probationary', 'Probationary period employee')
  ON CONFLICT (name) DO NOTHING;
END;
$$;

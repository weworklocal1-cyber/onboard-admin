-- Academy Course Pricing
-- Adds pricing fields to academy_courses
-- Existing courses default to free (is_free = true, price = 0)

alter table academy_courses
  add column if not exists is_free boolean default true,
  add column if not exists price numeric(10, 2) default 0,
  add column if not exists currency text default 'INR',
  add column if not exists instructor_name text,
  add column if not exists what_you_will_learn text[];

comment on column academy_courses.is_free is 'If true, course is free. If false, price must be > 0.';
comment on column academy_courses.price is 'Course price in the smallest currency unit (e.g., paise for INR).';
comment on column academy_courses.currency is 'ISO 4217 currency code, e.g. INR, USD.';

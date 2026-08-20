-- Academy Course Offer Pricing
-- Adds original price, discounted price, and offer duration for new user promotions

alter table academy_courses
  add column if not exists original_price numeric(10, 2),
  add column if not exists discounted_price numeric(10, 2),
  add column if not exists offer_duration_days integer default 3;

comment on column academy_courses.original_price is 'Original/regular course price shown after offer period expires.';
comment on column academy_courses.discounted_price is 'Discounted offer price shown to new users within offer_duration_days of registration.';
comment on column academy_courses.offer_duration_days is 'Number of days from user registration during which discounted_price is shown. Defaults to 3.';

-- Run this in: Supabase Dashboard > SQL Editor > New query > Paste & Run

-- 1. Enable UUID extension
create extension if not exists "uuid-ossp";

-- 2. Restaurant Partners
create table if not exists restaurant_partners (
  id uuid default uuid_generate_v4() primary key,
  timestamp timestamp with time zone default now(),
  owner_name text,
  mobile text,
  whatsapp text,
  email text,
  restaurant_name text,
  restaurant_type text,
  state text,
  district text,
  city text,
  locality text,
  landmark text,
  full_address text,
  pincode text,
  latitude numeric,
  longitude numeric,
  primary_locality text,
  additional_localities text,
  delivery_radius text,
  fssai_number text,
  number_of_branches text,
  average_daily_orders text, delivery_model text,
  additional_notes text, status text default 'new'
);

-- 3. Delivery Partners
create table if not exists delivery_partners (
  id uuid default uuid_generate_v4() primary key,
  timestamp timestamp with time zone default now(),
  full_name text,
  mobile text,
  whatsapp text,
  email text,
  state text,
  district text,
  city text,
  locality text,
  landmark text,
  pincode text,
  vehicle_type text,
  availability text,
  working_model text,
  salary_preference text,
  expected_income text,
  latitude numeric,
  longitude numeric,
  preferred_working_areas text,
  max_travel_distance text,
  status text default 'new'
);

-- 4. Careers
create table if not exists careers (
  id uuid default uuid_generate_v4() primary key,
  timestamp timestamp with time zone default now(),
  full_name text,
  mobile text,
  whatsapp text,
  email text,
  qualification text,
  experience text,
  current_company text,
  current_salary text,
  expected_salary text,
  state text,
  district text,
  city text,
  locality text,
  position_applying_for text,
  preferred_location text,
  resume_link text,
  portfolio_link text,
  linkedin_profile text,
  portfolio_website text,
  cover_letter text,
  status text default 'new'
);

-- 5. Contact Leads
create table if not exists contact_leads (
  id uuid default uuid_generate_v4() primary key,
  timestamp timestamp with time zone default now(),
  name text,
  email text,
  mobile text,
  subject text,
  message text,
  status text default 'new'
);

-- 6. Enable Row Level Security (optional, keep it open for now)
alter table restaurant_partners enable row level security;
alter table delivery_partners enable row level security;
alter table careers enable row level security;
alter table contact_leads enable row level security;

-- 7. Allow public inserts (for form submissions)
create policy "public inserts" on restaurant_partners for insert to anon, authenticated with check (true);
create policy "public inserts" on delivery_partners for insert to anon, authenticated with check (true);
create policy "public inserts" on careers for insert to anon, authenticated with check (true);
create policy "public inserts" on contact_leads for insert to anon, authenticated with check (true);

-- 8. Public can read their own inserts (for admin/viewing after auth)
create policy "public read" on restaurant_partners for select to anon using (true);
create policy "public read" on delivery_partners for select to anon using (true);
create policy "public read" on careers for select to anon using (true);
create policy "public read" on contact_leads for select to anon using (true);

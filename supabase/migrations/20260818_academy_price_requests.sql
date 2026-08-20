-- Academy Price Requests
-- Allows users to request a different price for a course

create table if not exists academy_price_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  course_id uuid references academy_courses(id) on delete cascade not null,
  requested_price numeric(10, 2) not null,
  reason text,
  status text not null default 'pending',
  admin_response text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_academy_price_requests_user_id on academy_price_requests(user_id);
create index if not exists idx_academy_price_requests_course_id on academy_price_requests(course_id);
create index if not exists idx_academy_price_requests_status on academy_price_requests(status);

comment on table academy_price_requests is 'Price negotiation requests from users for courses';
comment on column academy_price_requests.status is 'pending, approved, rejected';

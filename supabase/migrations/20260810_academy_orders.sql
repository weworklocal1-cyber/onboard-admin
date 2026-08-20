-- Academy Orders
-- Tracks payment transactions for paid courses

create table if not exists academy_orders (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) not null,
  course_id uuid references academy_courses(id) on delete cascade not null,
  amount numeric(10, 2) not null,
  currency text not null default 'INR',
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'cancelled', 'refunded')),
  payment_gateway text not null default 'razorpay',
  gateway_order_id text,
  gateway_payment_id text,
  gateway_signature text,
  metadata jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  paid_at timestamp with time zone
);

create index if not exists idx_academy_orders_user on academy_orders(user_id);
create index if not exists idx_academy_orders_course on academy_orders(course_id);
create index if not exists idx_academy_orders_gateway_order on academy_orders(gateway_order_id);
create index if not exists idx_academy_orders_gateway_payment on academy_orders(gateway_payment_id);
create unique index if not exists idx_academy_orders_user_course_pending on academy_orders(user_id, course_id) where status = 'pending';

alter table academy_orders enable row level security;

create policy "users can read own orders" on academy_orders for select to authenticated using (auth.uid() = user_id);
create policy "users can insert own order" on academy_orders for insert to authenticated with check (auth.uid() = user_id);
create policy "users can update own pending order" on academy_orders for update to authenticated using (auth.uid() = user_id and status = 'pending');

create policy "admins can manage orders" on academy_orders for all to authenticated using (
  (select role from admin_users where id = auth.uid()) in ('founder', 'super_admin', 'hr_admin')
);

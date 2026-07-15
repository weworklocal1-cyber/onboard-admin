-- Add confirmed status to academy enrollments
alter table academy_enrollments drop constraint if exists academy_enrollments_status_check;
alter table academy_enrollments add constraint academy_enrollments_status_check check (status in ('active', 'completed', 'dropped', 'confirmed'));

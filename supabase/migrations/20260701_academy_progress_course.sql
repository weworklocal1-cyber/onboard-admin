alter table academy_progress add column if not exists course_id uuid references academy_courses(id) on delete cascade;
create index if not exists idx_academy_progress_course on academy_progress(course_id);

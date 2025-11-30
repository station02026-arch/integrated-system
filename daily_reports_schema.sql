-- Drop existing table if exists (to reset schema)
drop table if exists public.daily_reports cascade;
drop table if exists public.daily_report_entries cascade;

-- 1. Daily Report Header (One per day per user)
create table public.daily_reports (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  report_date date not null default current_date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, report_date) -- Prevent duplicate reports for same day
);

-- 2. Daily Report Entries (Multiple projects per report)
create table public.daily_report_entries (
  id uuid default gen_random_uuid() primary key,
  report_id uuid references public.daily_reports(id) on delete cascade not null,
  project_id uuid references public.projects(id) not null,
  content text, -- Work description for this project
  materials jsonb default '[]'::jsonb, -- Materials used for this project
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.daily_reports enable row level security;
alter table public.daily_report_entries enable row level security;

-- Policies
create policy "Users can manage their own reports"
  on public.daily_reports for all
  using (auth.uid() = user_id);

create policy "Users can manage their own report entries"
  on public.daily_report_entries for all
  using (
    exists (
      select 1 from public.daily_reports
      where daily_reports.id = daily_report_entries.report_id
      and daily_reports.user_id = auth.uid()
    )
  );

-- Create drawings table
create table if not exists public.drawings (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) not null,
  type text not null check (type in ('piping', 'earthwork', 'plan', 'section')),
  data jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies
alter table public.drawings enable row level security;

-- Allow read access to everyone for now (refine later based on roles)
create policy "Enable read access for all users"
  on public.drawings for select
  using (true);

-- Allow insert/update for authenticated users (refine later)
create policy "Enable insert for authenticated users"
  on public.drawings for insert
  with check (auth.role() = 'authenticated');

create policy "Enable update for authenticated users"
  on public.drawings for update
  using (auth.role() = 'authenticated');

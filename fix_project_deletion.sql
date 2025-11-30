-- Fix Project Deletion Issues

-- 1. Ensure Projects table has RLS enabled and allows deletion
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.projects;

-- Create a comprehensive policy allowing all operations for authenticated users
CREATE POLICY "Enable all access for authenticated users" ON public.projects 
FOR ALL 
USING (auth.role() = 'authenticated');

-- 2. Update Foreign Keys to CASCADE ON DELETE
-- This ensures that when a project is deleted, related records are also deleted automatically.

-- Daily Report Entries
ALTER TABLE public.daily_report_entries
DROP CONSTRAINT IF EXISTS daily_report_entries_project_id_fkey;

ALTER TABLE public.daily_report_entries
ADD CONSTRAINT daily_report_entries_project_id_fkey
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- Drawings
ALTER TABLE public.drawings
DROP CONSTRAINT IF EXISTS drawings_project_id_fkey;

ALTER TABLE public.drawings
ADD CONSTRAINT drawings_project_id_fkey
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- Photos (using DO block to safely handle if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'photos') THEN
        -- Try to drop constraint with standard naming
        ALTER TABLE public.photos DROP CONSTRAINT IF EXISTS photos_project_id_fkey;
        
        -- Add constraint with CASCADE
        ALTER TABLE public.photos 
        ADD CONSTRAINT photos_project_id_fkey 
        FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
    END IF;
END $$;

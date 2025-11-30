-- Fix Customer RLS and Project-Customer Relation

-- 1. Ensure Customers table has RLS enabled
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.customers;

-- Create policy allowing all operations for authenticated users
CREATE POLICY "Enable all access for authenticated users" ON public.customers
FOR ALL
USING (auth.role() = 'authenticated');

-- 2. Ensure Projects table has customer_id column
-- (It likely does, but let's be safe)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'customer_id') THEN
        ALTER TABLE public.projects ADD COLUMN customer_id UUID REFERENCES public.customers(id);
    END IF;
END $$;

-- 3. Grant permissions just in case (for standard postgres roles)
GRANT ALL ON public.customers TO authenticated;
GRANT ALL ON public.projects TO authenticated;

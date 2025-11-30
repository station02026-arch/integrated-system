-- Migration: Allow Estimates and Contracts without Project ID, add Customer ID

-- 1. Modify Estimates Table
ALTER TABLE public.estimates
ALTER COLUMN project_id DROP NOT NULL;

ALTER TABLE public.estimates
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id);

-- 2. Modify Contracts Table
ALTER TABLE public.contracts
ALTER COLUMN project_id DROP NOT NULL;

ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id);

-- 3. Ensure RLS policies allow access to orphaned records
-- Existing policies are "Enable all access for authenticated users", which should cover it.
-- But let's double check if there are any specific policies that require project_id.
-- (Based on previous view, they were simple "auth.role() = 'authenticated'")

-- 4. Add index for performance (optional but good practice)
CREATE INDEX IF NOT EXISTS idx_estimates_customer_id ON public.estimates(customer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_customer_id ON public.contracts(customer_id);

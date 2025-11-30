-- Financial System Schema

-- Estimates Table
CREATE TABLE IF NOT EXISTS public.estimates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    estimate_number TEXT NOT NULL, -- e.g., EST-2024-001
    items JSONB DEFAULT '[]'::jsonb, -- Array of { name, quantity, unit, unit_price, amount }
    total_amount NUMERIC DEFAULT 0,
    tax_amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Contracts Table
CREATE TABLE IF NOT EXISTS public.contracts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    estimate_id UUID REFERENCES public.estimates(id) ON DELETE SET NULL,
    contract_date DATE,
    contract_amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'negotiating' CHECK (status IN ('negotiating', 'signed', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Billings Table
CREATE TABLE IF NOT EXISTS public.billings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
    billing_number TEXT NOT NULL, -- e.g., INV-2024-001
    issue_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    total_amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    billing_id UUID REFERENCES public.billings(id) ON DELETE CASCADE NOT NULL,
    payment_date DATE DEFAULT CURRENT_DATE,
    amount NUMERIC DEFAULT 0,
    method TEXT DEFAULT 'bank_transfer' CHECK (method IN ('bank_transfer', 'cash', 'check', 'other')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies (Simple: Authenticated users can do everything for now)
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users" ON public.estimates FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON public.contracts FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON public.billings FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON public.payments FOR ALL USING (auth.role() = 'authenticated');

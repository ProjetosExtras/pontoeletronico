
-- Tabela para armazenar as assinaturas únicas dos espelhos de ponto
CREATE TABLE IF NOT EXISTS public.point_mirror_signatures (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id),
    employee_id UUID NOT NULL REFERENCES public.employees(id),
    reference_period VARCHAR(7) NOT NULL, -- Formato 'YYYY-MM'
    signature_code TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(employee_id, reference_period)
);

-- Políticas de Segurança (RLS)
ALTER TABLE public.point_mirror_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view signatures for their company" ON public.point_mirror_signatures
    FOR SELECT
    USING (company_id IN (
        SELECT company_id FROM public.profiles WHERE profiles.id = auth.uid()
    ));

CREATE POLICY "Users can insert signatures for their company" ON public.point_mirror_signatures
    FOR INSERT
    WITH CHECK (company_id IN (
        SELECT company_id FROM public.profiles WHERE profiles.id = auth.uid()
    ));

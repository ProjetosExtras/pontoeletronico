-- Tabela para armazenar Tipos de Escala (Turnos)
CREATE TABLE IF NOT EXISTS public.work_shifts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    -- 'weekly' (semanal fixa) ou '12x36' (escala de revezamento)
    type TEXT NOT NULL CHECK (type IN ('weekly', '12x36')), 
    -- Armazena a configuração dos horários.
    -- Para 'weekly': { "mon": {"start": "08:00", "end": "17:00", "break_start": "12:00", "break_end": "13:00"}, ... }
    -- Para '12x36': { "start": "07:00", "end": "19:00", "break_duration_minutes": 60 }
    schedule_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Políticas de segurança (RLS)
ALTER TABLE public.work_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view work_shifts of their company" ON public.work_shifts
    FOR SELECT USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert work_shifts to their company" ON public.work_shifts
    FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update work_shifts of their company" ON public.work_shifts
    FOR UPDATE USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete work_shifts of their company" ON public.work_shifts
    FOR DELETE USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Adicionar coluna na tabela employees para vincular a escala
-- Usaremos work_shift_id como FK opcional por enquanto
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS work_shift_id UUID REFERENCES public.work_shifts(id) ON DELETE SET NULL;

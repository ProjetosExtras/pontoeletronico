-- Arquivo de correção de sintaxe e estrutura
-- Execute este script no Editor SQL do Supabase para garantir que as tabelas tenham as colunas corretas.

-- 1. Adicionar colunas na tabela companies (uma por vez para evitar erros de parser)
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS trade_name text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS zip_code text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS legal_nature text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS state_registration text;

-- 2. Adicionar colunas na tabela employees
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS cpf text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS pis text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS admission_date date;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS job_title text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS ctps_number text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS ctps_series text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS work_schedule jsonb;

-- 3. Adicionar constraints de unicidade se não existirem (bloco seguro)
DO $$
BEGIN
    -- CPF Único
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_cpf_key') THEN
        ALTER TABLE public.employees ADD CONSTRAINT employees_cpf_key UNIQUE (cpf);
    END IF;

    -- PIS Único
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_pis_key') THEN
        ALTER TABLE public.employees ADD CONSTRAINT employees_pis_key UNIQUE (pis);
    END IF;
END $$;

-- 4. Adicionar colunas na tabela time_entries
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS nsr bigserial;
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS hash text;
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS origin_ip text;
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS user_agent text;
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS edited boolean DEFAULT false;
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS original_entry_id uuid REFERENCES public.time_entries(id);

-- 5. Criar tabela work_schedules se não existir
CREATE TABLE IF NOT EXISTS public.work_schedules (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id uuid REFERENCES public.companies(id) NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    details jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Habilitar RLS na tabela work_schedules
ALTER TABLE public.work_schedules ENABLE ROW LEVEL SECURITY;

-- 7. Criar políticas para work_schedules (removendo antigas para evitar duplicidade/erro)
DROP POLICY IF EXISTS "Users can view work schedules in their company" ON public.work_schedules;
CREATE POLICY "Users can view work schedules in their company" ON public.work_schedules
  FOR SELECT USING (company_id = get_auth_user_company_id());

DROP POLICY IF EXISTS "Users can insert work schedules in their company" ON public.work_schedules;
CREATE POLICY "Users can insert work schedules in their company" ON public.work_schedules
  FOR INSERT WITH CHECK (company_id = get_auth_user_company_id());

DROP POLICY IF EXISTS "Users can update work schedules in their company" ON public.work_schedules;
CREATE POLICY "Users can update work schedules in their company" ON public.work_schedules
  FOR UPDATE USING (company_id = get_auth_user_company_id());

DROP POLICY IF EXISTS "Users can delete work schedules in their company" ON public.work_schedules;
CREATE POLICY "Users can delete work schedules in their company" ON public.work_schedules
  FOR DELETE USING (company_id = get_auth_user_company_id());

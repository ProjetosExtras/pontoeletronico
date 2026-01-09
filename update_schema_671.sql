-- Atualização do Schema para conformidade com Portaria 671 (REP-P)

-- Adicionar campos na tabela companies
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS trade_name text, -- Nome Fantasia
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS zip_code text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS legal_nature text, -- Natureza Jurídica
ADD COLUMN IF NOT EXISTS state_registration text; -- Inscrição Estadual

-- Adicionar campos na tabela employees
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS cpf text UNIQUE, -- Obrigatório
ADD COLUMN IF NOT EXISTS pis text UNIQUE, -- Obrigatório para AFD
ADD COLUMN IF NOT EXISTS admission_date date,
ADD COLUMN IF NOT EXISTS job_title text,
ADD COLUMN IF NOT EXISTS ctps_number text,
ADD COLUMN IF NOT EXISTS ctps_series text,
ADD COLUMN IF NOT EXISTS work_schedule jsonb; -- Definição de horários

-- Adicionar campos na tabela time_entries
ALTER TABLE public.time_entries
ADD COLUMN IF NOT EXISTS nsr bigserial, -- Número Sequencial de Registro (Sequencial único por banco ou particionado)
ADD COLUMN IF NOT EXISTS hash text, -- Assinatura digital do registro
ADD COLUMN IF NOT EXISTS origin_ip text,
ADD COLUMN IF NOT EXISTS user_agent text,
ADD COLUMN IF NOT EXISTS edited boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS original_entry_id uuid REFERENCES public.time_entries(id); -- Para rastreabilidade de edições

-- Tabela para armazenar jornadas de trabalho (escalas)
CREATE TABLE IF NOT EXISTS public.work_schedules (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id uuid REFERENCES public.companies(id) NOT NULL,
    name text NOT NULL, -- Ex: "08:00 as 17:00", "12x36"
    type text NOT NULL, -- "daily", "weekly", "shift"
    details jsonb NOT NULL, -- Detalhes dos horários
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS para work_schedules
ALTER TABLE public.work_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view work schedules in their company" ON public.work_schedules
  FOR SELECT USING (company_id = get_auth_user_company_id());

CREATE POLICY "Users can insert work schedules in their company" ON public.work_schedules
  FOR INSERT WITH CHECK (company_id = get_auth_user_company_id());

CREATE POLICY "Users can update work schedules in their company" ON public.work_schedules
  FOR UPDATE USING (company_id = get_auth_user_company_id());

CREATE POLICY "Users can delete work schedules in their company" ON public.work_schedules
  FOR DELETE USING (company_id = get_auth_user_company_id());

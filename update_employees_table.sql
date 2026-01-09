-- Executar este script no Editor SQL do Supabase para atualizar a tabela employees
-- sem causar erro de "tabela já existe".

ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS cpf text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS pis text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS job_title text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS admission_date date;

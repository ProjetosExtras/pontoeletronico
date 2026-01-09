-- Adicionar coluna shift_type na tabela employees
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS shift_type text DEFAULT 'standard';

-- Adicionar coluna justification na tabela time_entries
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS justification text;

-- Adicionar coluna nsr (Número Sequencial de Registro) na tabela time_entries
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS nsr bigint;

-- Adicionar coluna device_info na tabela time_entries
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS device_info text;

-- Atualizar constraint de tipo na tabela time_entries para permitir 'abono'
-- Primeiro removemos a constraint antiga se existir
ALTER TABLE public.time_entries DROP CONSTRAINT IF EXISTS time_entries_type_check;
-- Adicionamos a nova constraint
ALTER TABLE public.time_entries ADD CONSTRAINT time_entries_type_check CHECK (type IN ('entrada', 'intervalo', 'retorno', 'saida', 'abono'));

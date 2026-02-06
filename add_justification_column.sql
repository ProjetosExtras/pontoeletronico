ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS justification text;

-- Atualizar constraint de tipo para permitir 'abono'
ALTER TABLE public.time_entries DROP CONSTRAINT IF EXISTS time_entries_type_check;
ALTER TABLE public.time_entries ADD CONSTRAINT time_entries_type_check CHECK (type IN ('entrada', 'intervalo', 'retorno', 'saida', 'abono'));

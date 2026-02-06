-- Script para ajustar os turnos dos funcionários conforme solicitado

-- 1. Garantir que a coluna shift_type existe
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS shift_type text DEFAULT 'standard';

-- 2. Atualizar funcionário 32 (Danielle da Sil) para turno de 3h Diurno (08h-11h)
UPDATE public.employees 
SET shift_type = '3h_diurno' 
WHERE code = '32';

-- 3. Atualizar funcionário 31 (Vinicius Costa) para turno 12x36 Noturno (19h-07h)
UPDATE public.employees 
SET shift_type = '12x36_noturno' 
WHERE code = '31';

-- 4. Atualizar todos os outros funcionários para 12x36 Diurno (padrão)
UPDATE public.employees 
SET shift_type = '12x36'
WHERE code NOT IN ('31', '32');

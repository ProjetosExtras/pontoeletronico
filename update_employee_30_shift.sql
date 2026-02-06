-- Atualizar funcionário 30 para turno 12x36 Diurno (07:00-19:00)
UPDATE public.employees 
SET shift_type = '12x36' 
WHERE code = '30';

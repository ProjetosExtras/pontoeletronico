-- Atualizar funcionário 21 (Genivaldo Sousa) para turno 12x36 Diurno
UPDATE public.employees 
SET shift_type = '12x36' 
WHERE code = '21';

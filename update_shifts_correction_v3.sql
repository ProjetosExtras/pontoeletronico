-- Atualizar funcionário 3 (Dayse Cordeiro) para turno Padrão 09h-18h
UPDATE public.employees 
SET shift_type = 'standard_09_18' 
WHERE code = '3';

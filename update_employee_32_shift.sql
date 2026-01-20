-- Atualizar funcionário 32 para turno personalizado
-- Nota: A lógica de '3h_diurno' e '12x36' combinadas é tratada via código (empCode = '32')
-- O banco pode ficar como '12x36' ou '3h_diurno', o importante é o código
UPDATE public.employees 
SET shift_type = '12x36' 
WHERE code = '32';

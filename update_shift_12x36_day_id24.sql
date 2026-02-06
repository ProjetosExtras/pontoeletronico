-- Atualizar funcionário 24 para escala 12x36 Diurno (Padrão)
UPDATE employees 
SET shift_type = '12x36' 
WHERE code = '24';

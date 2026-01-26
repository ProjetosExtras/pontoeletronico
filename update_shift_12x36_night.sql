-- Atualizar funcionários 10, 14, 26, 31 para escala 12x36 Noturno
UPDATE employees 
SET shift_type = '12x36_noturno' 
WHERE code IN ('10', '14', '26', '31');

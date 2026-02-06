-- O nome da tabela no banco de dados é "employees" (em inglês).
-- Não use "funcionários".

UPDATE employees 
SET shift_type = '3h_alternado' 
WHERE code = '32';

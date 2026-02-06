-- Atualizar funcionário 17 para turno SEG-SEX 08:00-12:00
UPDATE public.employees 
SET shift_type = 'seg_sex_08_12' 
WHERE code = '17';

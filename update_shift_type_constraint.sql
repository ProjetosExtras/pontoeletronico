-- Este script garante que a coluna shift_type aceite o novo valor e quaisquer outros futuros
-- Ele remove a restrição de check existente (se houver) e garante que a coluna seja do tipo TEXT

DO $$
BEGIN
    -- 1. Se existir uma constraint de check chamada "employees_shift_type_check", remova-a
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_shift_type_check') THEN
        ALTER TABLE public.employees DROP CONSTRAINT employees_shift_type_check;
    END IF;

    -- 2. Se a coluna for do tipo ENUM, converta para TEXT para permitir novos valores flexíveis
    -- Isso também previne erros de "invalid input value for enum"
    ALTER TABLE public.employees 
    ALTER COLUMN shift_type TYPE TEXT;

    -- 3. (Opcional) Adicionar uma nova constraint se quisesse validar apenas os permitidos, 
    -- mas como o pedido foi "qualquer funcionário que o gestor quiser", deixar como TEXT é mais flexível.
    -- Se quiser restringir novamente, descomente as linhas abaixo e adicione os valores:
    -- ALTER TABLE public.employees 
    -- ADD CONSTRAINT employees_shift_type_check 
    -- CHECK (shift_type IN ('standard', '12x36', '12x36_noturno', '3h_diurno', 'standard_09_18', 'seg_qui_sab_7_16_sex_7_11'));

END $$;

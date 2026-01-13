
DO $$
DECLARE
    v_company_id uuid;
BEGIN
    -- 1. Obter o ID da empresa (pega a primeira encontrada)
    SELECT id INTO v_company_id FROM public.companies LIMIT 1;

    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Nenhuma empresa encontrada. Crie uma empresa primeiro.';
    END IF;

    -- 2. Inserir funcionários (UPSERT: Atualiza se já existir pelo código)
    INSERT INTO public.employees (company_id, code, name, job_title)
    VALUES
    (v_company_id, '1', 'maycon wender', 'crevin'),
    (v_company_id, '2', 'waleria afonsor', 'crevin'),
    (v_company_id, '3', 'dayse cordeiro', 'crevin'),
    (v_company_id, '4', 'lindalva marina', 'cozinha'),
    (v_company_id, '5', 'maria aparecida', 'cozinha'),
    (v_company_id, '6', 'torniday da sil', 'motorista'),
    (v_company_id, '7', 'adrielle maria', 'cuidador idoso'),
    (v_company_id, '8', 'juliana cardoso', 'cuidador idoso'),
    (v_company_id, '9', 'francisca pinhe', 'auxiliar cuidad'),
    (v_company_id, '10', 'warlen junior', 'cuidador idoso'),
    (v_company_id, '11', 'sebastiao mende', 'cuidador idoso'),
    (v_company_id, '12', 'rogerlane perei', 'cuidador idoso'),
    (v_company_id, '13', 'valdinar sousa', 'tec enfermagem'),
    (v_company_id, '14', 'luciene ferreir', 'cuidador idoso'),
    (v_company_id, '15', 'quezia borges', 'nutricionista'),
    (v_company_id, '16', 'hayane formiga', 'enfermeira'),
    (v_company_id, '17', 'layanne campos', 'psicologa clini'),
    (v_company_id, '18', 'rosely moraes', 'aux serv gerais'),
    (v_company_id, '19', 'gilcelia mirian', 'aux serv gerais'),
    (v_company_id, '20', 'maria das dores', 'aux serv gerais'),
    (v_company_id, '21', 'genivaldo sousa', 'aux serv gerais'),
    (v_company_id, '22', 'giovanna da sil', 'cuidador idoso'),
    (v_company_id, '23', 'sammy de sousa', 'auxiliar cuidad'),
    (v_company_id, '24', 'edilene marinho', 'cozinha'),
    (v_company_id, '25', 'geralda rodrigu', 'cozinha'),
    (v_company_id, '26', 'maria de fatima', 'cuidador idoso'),
    (v_company_id, '27', 'beatriz batista', 'cuidador idoso'),
    (v_company_id, '28', 'tatiane da silv', 'cuidador idoso'),
    (v_company_id, '29', 'darlene da silv', 'tec enfermagem'),
    (v_company_id, '30', 'antonia de mari', 'cuidador idoso'),
    (v_company_id, '31', 'vinicius costa', 'cuidador idoso'),
    (v_company_id, '32', 'danielle da sil', 'fisioterapeuta'),
    (v_company_id, '33', 'rosemar rosseto', 'aux lavanderia')
    ON CONFLICT (company_id, code) 
    DO UPDATE SET 
        name = EXCLUDED.name,
        job_title = EXCLUDED.job_title;

    -- 3. Atualizar turnos específicos
    UPDATE public.employees SET shift_type = '12x36_noturno' WHERE company_id = v_company_id AND code = '31';

END $$;

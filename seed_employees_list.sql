
    -- Exceção: funcionário código 32: 3h Diurno (08h–11h)
    UPDATE public.employees 
    SET shift_type = '3h_diurno' 
    WHERE company_id = v_company_id AND code = '32';

    -- Exceção: funcionário código 3: Padrão (09:00-18:00)
    UPDATE public.employees 
    SET shift_type = 'standard_09_18' 
    WHERE company_id = v_company_id AND code = '3';

END $$;

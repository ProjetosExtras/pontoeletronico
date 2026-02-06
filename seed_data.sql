-- SQL Seed Data for Testing (Execute only if you have NO data)

-- 1. Get your User ID (You need to be logged in and know your UUID)
-- Replace 'THE_USER_UUID_HERE' with your actual Supabase User ID
-- You can find this in the Authentication > Users tab in Supabase dashboard.
-- For this script to work autonomously without manual ID insertion, we will assume you are running this in the SQL Editor where you can look it up.
-- However, for a generic script, we'll create a function to help seeding for the current user if run via RLS, or just generic inserts.

-- IMPORTANT: This script assumes you have already run 'update_schema_671.sql'

-- Let's assume we are inserting data for the first company found or creating one if needed.
DO $$
DECLARE
    v_user_id uuid;
    v_company_id uuid;
    v_employee_id uuid;
BEGIN
    -- Try to get the first admin user (just for demo purposes in a fresh DB)
    -- In a real scenario, you should replace this with your specific user ID.
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;

    IF v_user_id IS NOT NULL THEN
        -- Check if company exists for this user
        SELECT id INTO v_company_id FROM public.companies WHERE owner_id = v_user_id LIMIT 1;

        -- If no company, create one
        IF v_company_id IS NULL THEN
            INSERT INTO public.companies (name, cnpj, owner_id, trade_name, address, city, state, zip_code)
            VALUES ('Empresa Demonstração Ltda', '12.345.678/0001-90', v_user_id, 'PontoCrevin Demo', 'Av. Paulista, 1000', 'São Paulo', 'SP', '01310-100')
            RETURNING id INTO v_company_id;
            
            -- Link profile to company
            UPDATE public.profiles SET company_id = v_company_id WHERE id = v_user_id;
        END IF;

        -- Insert Sample Employees
        INSERT INTO public.employees (company_id, name, code, cpf, pis, job_title, admission_date)
        VALUES 
            (v_company_id, 'João da Silva', '001', '123.456.789-00', '12345678901', 'Desenvolvedor', '2023-01-15'),
            (v_company_id, 'Maria Oliveira', '002', '987.654.321-00', '10987654321', 'Gerente de RH', '2023-02-20'),
            (v_company_id, 'Carlos Santos', '003', '111.222.333-44', '11223344556', 'Analista Financeiro', '2023-03-10')
        ON CONFLICT (company_id, code) DO NOTHING;

        -- Get an employee ID for time entries
        SELECT id INTO v_employee_id FROM public.employees WHERE company_id = v_company_id LIMIT 1;

        -- Insert Sample Time Entries for today
        INSERT INTO public.time_entries (employee_id, company_id, type, timestamp, location_lat, location_long, device_info, nsr)
        VALUES
            (v_employee_id, v_company_id, 'entrada', NOW() - INTERVAL '4 hours', -23.550520, -46.633308, 'Browser/Chrome', 1001),
            (v_employee_id, v_company_id, 'intervalo', NOW() - INTERVAL '1 hour', -23.550520, -46.633308, 'Browser/Chrome', 1002)
        ON CONFLICT DO NOTHING; -- Assuming no conflict on ID, but just safe practice if repeated

    END IF;
END $$;

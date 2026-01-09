-- Correção da função de segurança
-- Execute este bloco separadamente para corrigir o erro de sintaxe ".."

CREATE OR REPLACE FUNCTION public.get_auth_user_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

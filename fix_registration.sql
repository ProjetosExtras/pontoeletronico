-- PASSO 1: Limpeza do cadastro travado
-- Remove o usuário do Auth e a empresa (se existir), permitindo tentar de novo.

-- Deletar da tabela de empresas (caso tenha sido criada parcialmente)
DELETE FROM public.companies WHERE cnpj = '01.600.253/0001-69';

-- Deletar usuário do Auth (Isso vai remover em cascata o perfil em public.profiles se configurado, ou ficará órfão)
DELETE FROM auth.users WHERE email = 'crevinrcc@gmail.com';


-- PASSO 2: Correção da Estrutura e Permissões (RLS)
-- Isso evita o erro de "recursão infinita" e permite que o criador da empresa a veja.

-- Adicionar coluna owner_id se não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'owner_id') THEN
        ALTER TABLE public.companies ADD COLUMN owner_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Função de segurança para evitar recursão infinita nas políticas
CREATE OR REPLACE FUNCTION public.get_auth_user_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Remover políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;
DROP POLICY IF EXISTS "Users can update their own company" ON public.companies;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.companies;

-- Novas Políticas de Segurança (RLS) para Companies

-- 1. Leitura: Usuário vê a empresa se for o dono (owner_id) OU se pertencer a ela (via profile)
CREATE POLICY "Users can view their own company" ON public.companies
  FOR SELECT USING (
    auth.uid() = owner_id 
    OR 
    id = get_auth_user_company_id()
  );

-- 2. Inserção: Qualquer usuário autenticado pode criar uma empresa (e se torna o owner)
CREATE POLICY "Enable insert for authenticated users only" ON public.companies
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 3. Atualização: Apenas o dono ou membros da empresa podem editar
CREATE POLICY "Users can update their own company" ON public.companies
  FOR UPDATE USING (
    auth.uid() = owner_id 
    OR 
    id = get_auth_user_company_id()
  );

-- Garantir que RLS está ativo
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

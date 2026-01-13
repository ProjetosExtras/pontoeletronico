-- Fix for Editing Time Entries (Policies & Constraints)

-- 1. Ensure is_manual column exists
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS is_manual boolean DEFAULT false;

-- 2. Update Type Constraint to include 'abono'
ALTER TABLE public.time_entries DROP CONSTRAINT IF EXISTS time_entries_type_check;
ALTER TABLE public.time_entries ADD CONSTRAINT time_entries_type_check CHECK (type IN ('entrada', 'intervalo', 'retorno', 'saida', 'abono'));

-- 3. Update RLS Policies for time_entries
-- First, drop existing policies if they might conflict (or to ensure clean slate for these specific actions)
DROP POLICY IF EXISTS "Users can update time entries in their company" ON public.time_entries;
DROP POLICY IF EXISTS "Users can update time_entries in their company" ON public.time_entries; -- Handle potential naming variations
DROP POLICY IF EXISTS "Users can delete time entries in their company" ON public.time_entries;
DROP POLICY IF EXISTS "Users can delete time_entries in their company" ON public.time_entries;

-- Re-create UPDATE policy
CREATE POLICY "Users can update time entries in their company" ON public.time_entries
  FOR UPDATE USING (company_id = get_auth_user_company_id());

-- Re-create DELETE policy
CREATE POLICY "Users can delete time entries in their company" ON public.time_entries
  FOR DELETE USING (company_id = get_auth_user_company_id());

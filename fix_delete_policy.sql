-- Enable DELETE for authenticated users on time_entries table
-- This is required for the "Clear Imports" functionality to work

CREATE POLICY "Users can delete time_entries in their company" ON public.time_entries
  FOR DELETE USING (company_id = get_auth_user_company_id());

-- Also enable UPDATE if not already present, just in case
CREATE POLICY "Users can update time_entries in their company" ON public.time_entries
  FOR UPDATE USING (company_id = get_auth_user_company_id());

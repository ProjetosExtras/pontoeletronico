-- Add is_manual column to time_entries table
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS is_manual boolean DEFAULT false;

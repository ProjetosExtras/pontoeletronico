import { createClient } from '@supabase/supabase-js';

// Credentials provided by the user
const supabaseUrl = 'https://cazwupydodlfeubliewe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhend1cHlkb2RsZmV1YmxpZXdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MjkxNjUsImV4cCI6MjA4MzMwNTE2NX0.VfPNetVkFGRRT4rPg6agV89m4__pyDepLzgJFPscCIY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

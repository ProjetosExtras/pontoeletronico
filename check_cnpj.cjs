const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cazwupydodlfeubliewe.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhend1cHlkb2RsZmV1YmxpZXdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzcyOTE2NSwiZXhwIjoyMDgzMzA1MTY1fQ.PW_qPCr-uJnjMzSF5FHZJcDi_SNT4NVPAw_TYco-mBg';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkCNPJ() {
  const cnpj = '01.600.253/0001-69';
  console.log(`[SCRIPT] Verificando CNPJ: ${cnpj}...`);

  const { data, error } = await supabase
    .from('companies')
    .select('id, name')
    .eq('cnpj', cnpj);

  if (error) {
    console.error('[SCRIPT] Erro na busca:', error);
  } else if (data && data.length > 0) {
    console.log('[SCRIPT] CNPJ ENCONTRADO! ID:', data[0].id);
  } else {
    console.log('[SCRIPT] CNPJ NÃO encontrado no banco de dados.');
  }
}

checkCNPJ();

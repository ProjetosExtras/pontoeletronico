
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Usar Service Key para ignorar RLS e testar sintaxe pura

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Variáveis de ambiente ausentes.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testInsert() {
  console.log("Testando INSERT na tabela employees...");

  // Criar uma empresa fake para teste se precisar
  // Mas vamos tentar inserir com um UUID qualquer primeiro, só para ver se o banco rejeita sintaxe.
  // Melhor buscar uma empresa existente.
  
  const { data: company } = await supabase.from('companies').select('id').limit(1).single();
  
  if (!company) {
    console.log("Nenhuma empresa encontrada para teste.");
    return;
  }

  const fakeEmployee = {
    company_id: company.id,
    name: "Teste Sintaxe",
    code: "TEST999",
    cpf: "00000000000",
    // pis: "00000000000", // Opcional no banco se não tiver unique constraint ativada ainda ou se for null
    // job_title: "Tester",
    // admission_date: "2024-01-01"
  };

  const { data, error } = await supabase.from('employees').insert(fakeEmployee).select();

  if (error) {
    console.error("Erro no INSERT:", error);
  } else {
    console.log("INSERT com sucesso:", data);
    // Limpar
    await supabase.from('employees').delete().eq('id', data[0].id);
  }
}

testInsert();

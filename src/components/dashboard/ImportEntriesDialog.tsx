
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";
import { format, parse } from "date-fns";

export function ImportEntriesDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const { toast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

        const entriesToImport = await parseExcelData(data);
        setParsedData(entriesToImport);
        toast({
          title: "Arquivo processado",
          description: `${entriesToImport.length} registros encontrados.`,
        });
      } catch (error) {
        console.error(error);
        toast({
          variant: "destructive",
          title: "Erro ao ler arquivo",
          description: "Verifique o formato do arquivo.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const parseExcelData = async (data: any[][]) => {
    const entries: any[] = [];
    let currentYear = new Date().getFullYear();
    let currentMonth = new Date().getMonth(); // 0-indexed

    // 1. Tentar encontrar o período no cabeçalho
    // Ex: "Período: 2025/12/01 ~ 12/31"
    for (let i = 0; i < 10; i++) { // Busca nas primeiras 10 linhas
      const rowStr = data[i]?.join(" ");
      if (rowStr && rowStr.includes("Período:")) {
        const match = rowStr.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
        if (match) {
          currentYear = parseInt(match[1]);
          currentMonth = parseInt(match[2]) - 1; // JS months are 0-11
          console.log(`Período detectado: ${currentYear}-${currentMonth + 1}`);
        }
        break;
      }
    }

    // 2. Mapear colunas de dias (1 a 31)
    let dayColumns: { [key: number]: number } = {}; // dia -> index da coluna
    let daysRowIndex = -1;

    for (let i = 0; i < 30; i++) {
        const row = data[i];
        if (!row) continue;
        
        let tempDayColumns: { [key: number]: number } = {};
        let foundSequence = 0;
        
        row.forEach((cell, idx) => {
            const val = parseInt(String(cell).trim());
            // Aceita se for um número entre 1 e 31
            if (!isNaN(val) && val >= 1 && val <= 31) {
                 // Verifica se é sequencial em relação ao anterior encontrado (opcional, mas ajuda a confirmar)
                 // Aqui vamos apenas guardar onde está cada dia
                 tempDayColumns[val] = idx;
                 foundSequence++;
            }
        });

        if (foundSequence >= 3) {
            dayColumns = tempDayColumns;
            daysRowIndex = i;
            console.log("Linha de dias encontrada:", i, dayColumns);
            break;
        }
    }

    if (daysRowIndex === -1) {
        console.warn("Linha de dias não detectada automaticamente.");
    }

    // 3. Varrer funcionários
    let foundEmployees = 0;
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      // Estratégia de busca na linha inteira
      let isEmployeeRow = false;
      let empCode = "";
      let empName = "";
      let empDept = "";

      // Converter linha toda para string para busca rápida inicial
      const rowStr = row.join(" ").toLowerCase();
      
      const keywords = ["no", "mat", "matrícula", "matricula", "código", "codigo", "id", "funcionário", "funcionario", "departamento", "dept", "nome"];
      const hasKeyword = keywords.some(k => 
          rowStr.includes(`${k}:`) || 
          rowStr.includes(`${k}.`) || 
          (row[0] && String(row[0]).trim().toLowerCase().startsWith(k))
      );

      if (hasKeyword) {
           // Agora varre as células para extrair precisamente
           for (let c = 0; c < row.length; c++) {
               const cellVal = String(row[c] || "").trim();
               
               // Detectar Código
               // Regex flexível para capturar variações de etiquetas de código
               const codeLabelRegex = /^(no|mat|matrícula|matricula|código|codigo|id)[:.]?$/i;
               const codeValueRegex = /^(no|mat|matrícula|matricula|código|codigo|id)[:.]?\s*(\d+)$/i;

               if (codeLabelRegex.test(cellVal)) {
                   // O código deve estar na próxima célula não vazia
                   for (let k = c + 1; k < row.length && k < c + 5; k++) {
                       const nextVal = String(row[k] || "").trim();
                       if (nextVal && /^\d+$/.test(nextVal)) {
                           empCode = nextVal;
                           isEmployeeRow = true;
                           break;
                       }
                   }
               } else if (codeValueRegex.test(cellVal)) {
                   // "No: 1" na mesma célula
                   const match = cellVal.match(codeValueRegex);
                   if (match) {
                       empCode = match[2]; // Grupo 2 tem o número
                       isEmployeeRow = true;
                   }
               }

               if (/^nome[:.]?$/i.test(cellVal) || /^funcion[aá]rio[:.]?$/i.test(cellVal)) {
                   for (let k = c + 1; k < row.length && k < c + 5; k++) {
                       const nextVal = String(row[k] || "").trim();
                       if (nextVal) {
                           empName = nextVal;
                           break;
                       }
                   }
               } else if (/^nome[:.]?\s*(.+)$/i.test(cellVal)) {
                   const match = cellVal.match(/^nome[:.]?\s*(.+)$/i);
                   if (match) empName = match[1];
               } else if (/^funcion[aá]rio[:.]?\s*(.+)$/i.test(cellVal)) {
                   const match = cellVal.match(/^funcion[aá]rio[:.]?\s*(.+)$/i);
                   if (match) empName = match[1];
               }

               if (/^(departamento|dept)[:.]?$/i.test(cellVal)) {
                    for (let k = c + 1; k < row.length && k < c + 5; k++) {
                        const nextVal = String(row[k] || "").trim();
                        if (nextVal) {
                            empDept = nextVal;
                            break;
                        }
                    }
               } else if (/^(departamento|dept)[:.]?\s*(.+)$/i.test(cellVal)) {
                    const match = cellVal.match(/^(departamento|dept)[:.]?\s*(.+)$/i);
                    if (match) empDept = match[2];
               }
           }
      }

      if (!isEmployeeRow) {
          const firstVal = String(row[0] || "").trim();
          const secondVal = String(row[1] || "").trim();
          if (/^\d+$/.test(firstVal) && secondVal && /[A-Za-zÀ-ÿ]/.test(secondVal)) {
              empCode = firstVal;
              empName = secondVal;
              isEmployeeRow = true;
          }
      }

      if (isEmployeeRow && empCode) {
        foundEmployees++;
        
        const dataRowIndex = i + 1;
        const dataRow = data[dataRowIndex];
        const sameRow = row;

        if (dataRow) {
            for (const [day, colIdx] of Object.entries(dayColumns)) {
                const cellContentPrimary = dataRow[colIdx];
                const cellContentSameRow = sameRow[colIdx];
                const neighbor1 = dataRow[colIdx + 1];
                const neighbor2 = dataRow[colIdx + 2];
                const sources = [cellContentPrimary, cellContentSameRow, neighbor1, neighbor2].filter(Boolean);
                const times = sources
                  .map(s => String(s))
                  .join(" ")
                  .split(/[\n\s]+/)
                  .filter(t => t.match(/^\d{1,2}:\d{2}$/));
                    
                    times.forEach((time, index) => {
                        let type = 'entrada';
                        if (index === 1) type = 'intervalo';
                        if (index === 2) type = 'retorno';
                        if (index === 3) type = 'saida';
                        if (index > 3) type = 'saida';

                        const [hh, mm] = time.split(':').map(Number);
                        const date = new Date(currentYear, currentMonth, parseInt(day), hh, mm);
                        
                        entries.push({
                            empCode,
                            empName,
                            empDept,
                            timestamp: date.toISOString(),
                            type,
                            originalTime: time
                        });
                    });
                }
            }
        }
        if (!dataRow) {
            for (const [day, colIdx] of Object.entries(dayColumns)) {
                const cellValue = sameRow[colIdx];
                if (cellValue) {
                    const times = String(cellValue).split(/[\n\s]+/).filter(t => t.match(/^\d{1,2}:\d{2}$/));
                    times.forEach((time, index) => {
                        let type = 'entrada';
                        if (index === 1) type = 'intervalo';
                        if (index === 2) type = 'retorno';
                        if (index === 3) type = 'saida';
                        const [hh, mm] = time.split(':').map(Number);
                        const date = new Date(currentYear, currentMonth, parseInt(day), hh, mm);
                        entries.push({
                            empCode,
                            empName,
                            empDept,
                            timestamp: date.toISOString(),
                            type,
                            originalTime: time
                        });
                    });
                }
            }
        }
      }
    }

    if (entries.length === 0 && foundEmployees > 0) {
        console.warn(`Encontrados ${foundEmployees} funcionários, mas 0 registros de tempo. Verifique o mapeamento de colunas.`);
    }

    return entries;
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;
    setIsLoading(true);

    try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user?.id).single();
        
        if (!profile?.company_id) throw new Error("Empresa não encontrada");

        // 1. Buscar todos funcionários da empresa para mapear Código -> ID
        const { data: employees } = await supabase
            .from('employees')
            .select('id, code, name')
            .eq('company_id', profile.company_id);

        const empMap = new Map();
        const empNameMap = new Map(); // Mapa para buscar por nome
        employees?.forEach(e => {
            if (e.code) empMap.set(e.code, e.id);
            if (e.name) empNameMap.set(e.name.toLowerCase().trim(), e.id);
        });

        // Identificar e cadastrar novos funcionários automaticamente
        const uniqueNewEmployees = new Map(); // code -> { name, dept }
        for (const entry of parsedData) {
            const hasCodeMatch = empMap.has(entry.empCode);
            const hasNameMatch = entry.empName && empNameMap.has(entry.empName.toLowerCase().trim());
            
            if (!hasCodeMatch && !hasNameMatch) {
                // Prioritize finding a non-empty name
                if (!uniqueNewEmployees.has(entry.empCode) || !uniqueNewEmployees.get(entry.empCode).name) {
                     uniqueNewEmployees.set(entry.empCode, { name: entry.empName, dept: entry.empDept });
                }
            }
        }

        if (uniqueNewEmployees.size > 0) {
            const newEmployeesToInsert = Array.from(uniqueNewEmployees.entries()).map(([code, data]: [string, any]) => ({
                company_id: profile.company_id,
                name: data.name || `Funcionário ${code}`,
                code: code,
                job_title: data.dept || null,
            }));

            const { data: createdEmployees, error: createError } = await supabase
                .from('employees')
                .insert(newEmployeesToInsert)
                .select('id, code, name');
            
            if (createError) {
                console.error("Erro ao criar funcionários:", createError);
                throw new Error("Erro ao cadastrar novos funcionários automaticamente: " + createError.message);
            }

            // Atualizar mapas com os novos IDs
            createdEmployees?.forEach(e => {
                if (e.code) empMap.set(e.code, e.id);
                if (e.name) empNameMap.set(e.name.toLowerCase().trim(), e.id);
            });
            
            toast({
                title: "Novos Funcionários",
                description: `${createdEmployees?.length} funcionários foram cadastrados automaticamente.`,
            });
        }

        // Buscar registros existentes para evitar duplicatas
        const timestamps = parsedData.map(d => new Date(d.timestamp).getTime());
        const minTime = new Date(Math.min(...timestamps));
        // Subtract 1 minute and Add 1 minute to be safe with margins
        minTime.setMinutes(minTime.getMinutes() - 1);
        const maxTime = new Date(Math.max(...timestamps));
        maxTime.setMinutes(maxTime.getMinutes() + 1);

        const { data: existingEntries } = await supabase
            .from('time_entries')
            .select('employee_id, timestamp')
            .eq('company_id', profile.company_id)
            .gte('timestamp', minTime.toISOString())
            .lte('timestamp', maxTime.toISOString());
        
        const existingSet = new Set();
        existingEntries?.forEach(e => {
            // Normalize to ISO string for comparison
            existingSet.add(`${e.employee_id}|${new Date(e.timestamp).toISOString()}`);
        });

        const entriesToInsert = [];
        const missingEmployees = new Set();
        let duplicatesCount = 0;

        for (const entry of parsedData) {
            let empId = empMap.get(entry.empCode);
            
            // Tentar match por nome se não achou pelo código
            if (!empId && entry.empName) {
                empId = empNameMap.get(entry.empName.toLowerCase().trim());
            }

            if (empId) {
                const key = `${empId}|${new Date(entry.timestamp).toISOString()}`;
                if (!existingSet.has(key)) {
                    entriesToInsert.push({
                        company_id: profile.company_id,
                        employee_id: empId,
                        type: entry.type,
                        timestamp: entry.timestamp,
                        device_info: "Importação Excel",
                        created_at: new Date().toISOString()
                    });
                    // Add to set to prevent duplicates within the same import file
                    existingSet.add(key);
                } else {
                    duplicatesCount++;
                }
            } else {
                missingEmployees.add(`${entry.empName} (Cód: ${entry.empCode})`);
            }
        }

        if (entriesToInsert.length > 0) {
            const { error } = await supabase.from('time_entries').insert(entriesToInsert);
            if (error) throw error;

            toast({
                title: "Sucesso!",
                description: `${entriesToInsert.length} registros importados.${duplicatesCount > 0 ? ` ${duplicatesCount} duplicados ignorados.` : ''}`,
            });
            setIsOpen(false);
            setParsedData([]);
            setFileName(null);
        } else {
            if (duplicatesCount > 0) {
                toast({
                    title: "Importação concluída",
                    description: `Todos os ${duplicatesCount} registros encontrados já existem no sistema.`,
                });
                setIsOpen(false);
                setParsedData([]);
                setFileName(null);
            } else {
                toast({
                    variant: "destructive",
                    title: "Nenhum registro importado",
                    description: "Verifique se os códigos dos funcionários correspondem.",
                });
            }
        }

        if (missingEmployees.size > 0) {
             toast({
                variant: "warning",
                title: "Funcionários não encontrados",
                description: Array.from(missingEmployees).join(", "),
            });
        }

    } catch (error: any) {
        console.error(error);
        toast({
            variant: "destructive",
            title: "Erro na importação",
            description: error.message || "Erro desconhecido",
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Importar Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Importar Registros de Ponto</DialogTitle>
          <DialogDescription>
            Selecione o arquivo Excel (.xlsx) no formato padrão do relógio.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="flex items-center justify-center w-full">
            <Label
              htmlFor="dropzone-file"
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 border-gray-300"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-2 text-gray-500" />
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Clique para enviar</span>
                </p>
                <p className="text-xs text-gray-500">XLSX ou CSV</p>
              </div>
              <Input
                id="dropzone-file"
                type="file"
                className="hidden"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                disabled={isLoading}
              />
            </Label>
          </div>

          {fileName && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded">
                <CheckCircle className="h-4 w-4" />
                Arquivo selecionado: {fileName}
            </div>
          )}

          {parsedData.length > 0 && (
             <div className="text-sm text-gray-600">
                <p>{parsedData.length} registros prontos para importar.</p>
                <p className="text-xs text-gray-400 mt-1">
                    Nota: Certifique-se que os funcionários já estão cadastrados com a matrícula (No) correta.
                </p>
             </div>
          )}
        </div>

        <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
                Cancelar
            </Button>
            <Button onClick={handleImport} disabled={parsedData.length === 0 || isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Importar Dados
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

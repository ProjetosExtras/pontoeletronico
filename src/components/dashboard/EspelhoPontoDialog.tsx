
import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, Download, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { generateEspelhoPDF } from "@/utils/generators";
import { toast } from "sonner";
import { format } from "date-fns";

export function EspelhoPontoDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [fetchingEmployees, setFetchingEmployees] = useState(false);

  useEffect(() => {
    if (open) {
      fetchEmployees();
    }
  }, [open]);

  const fetchEmployees = async () => {
    setFetchingEmployees(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user?.id).single();
        
        if (profile?.company_id) {
            const { data } = await supabase
                .from('employees')
                .select('id, name, code')
                .eq('company_id', profile.company_id)
                .order('name');
            setEmployees(data || []);
        }
    } catch (error) {
        console.error("Erro ao buscar funcionários:", error);
        toast.error("Erro ao carregar lista de funcionários.");
    } finally {
        setFetchingEmployees(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedEmployee) {
        toast.error("Selecione um funcionário.");
        return;
    }

    setLoading(true);
    try {
        await generateEspelhoPDF(selectedEmployee, selectedMonth);
        toast.success("Espelho de Ponto gerado com sucesso!");
        setOpen(false);
    } catch (error: any) {
        toast.error(`Erro ao gerar PDF: ${error.message}`);
    } finally {
        setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Gerar PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" />
            Gerar Espelho de Ponto
          </DialogTitle>
          <DialogDescription>
            Selecione o funcionário e o período para gerar o relatório.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
            <div className="space-y-2">
                <label className="text-sm font-medium leading-none">
                    Funcionário
                </label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee} disabled={fetchingEmployees}>
                    <SelectTrigger>
                        <SelectValue placeholder={fetchingEmployees ? "Carregando..." : "Selecione um funcionário"} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os Funcionários</SelectItem>
                        {employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                                {emp.name} {emp.code ? `(Mat: ${emp.code})` : ''}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium leading-none">
                    Mês de Referência
                </label>
                <Input 
                    type="month" 
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                />
            </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleGenerate} disabled={loading || !selectedEmployee}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Gerar Relatório
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

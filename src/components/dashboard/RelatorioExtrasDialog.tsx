
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
import { Loader2, Download, FileText, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { generateRelatorioExtrasPDF } from "@/utils/generators";
import { toast } from "sonner";
import { format } from "date-fns";

export function RelatorioExtrasDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<string>("");
    const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
    const [shiftType, setShiftType] = useState<string>("auto");
    const [fetchingEmployees, setFetchingEmployees] = useState(false);

    useEffect(() => {
        if (open) {
            fetchEmployees();
        }
    }, [open]);

    useEffect(() => {
        if (selectedEmployee && selectedEmployee !== 'all') {
            const emp = employees.find(e => e.id === selectedEmployee);
            if (emp && emp.shift_type) {
                setShiftType(emp.shift_type);
            } else {
                setShiftType('auto');
            }
        } else if (selectedEmployee === 'all') {
             setShiftType('auto');
        }
    }, [selectedEmployee, employees]);

    const fetchEmployees = async () => {
        setFetchingEmployees(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user?.id).single();
            
            if (profile?.company_id) {
                const { data } = await supabase
                    .from('employees')
                    .select('id, name, code, shift_type')
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
            await generateRelatorioExtrasPDF(selectedEmployee, selectedMonth, shiftType);
            toast.success("Relatório de Horas Extras gerado com sucesso!");
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
            <Clock className="mr-2 h-4 w-4" />
            Gerar PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600" />
            Relatório de Horas Extras
          </DialogTitle>
          <DialogDescription>
            Selecione o funcionário e o período para gerar o relatório de horas extras.
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

            <div className="space-y-2">
                <label className="text-sm font-medium leading-none">
                    Tipo de Escala (Forçar)
                </label>
                <Select value={shiftType} onValueChange={setShiftType}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione a escala" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="auto">Automático (Usar escala cadastrada)</SelectItem>
                        <SelectItem value="standard">Padrão (Seg-Sex)</SelectItem>
                        <SelectItem value="12x36">12x36 (Diurno)</SelectItem>
                        <SelectItem value="12x36_noturno">12x36 (Noturno)</SelectItem>
                        <SelectItem value="standard_09_18">Padrão (09:00-18:00)</SelectItem>
                        <SelectItem value="3h_diurno">3h Diurno (08:00-11:00)</SelectItem>
                        <SelectItem value="seg_sex_08_11">SEG-SEX 08:00-11:00</SelectItem>
                        <SelectItem value="seg_sex_08_12">SEG-SEX 08:00-12:00</SelectItem>
                        <SelectItem value="seg_qui_sab_7_16_sex_7_11">
                            SEG-QUI+SAB 07:00-16:00 | SEX 07:00-11:00
                        </SelectItem>
                        <SelectItem value="seg_sex_07_16_sab_08_12">
                            SEG-SEX 07:00-16:00 | SAB 08:00-12:00
                        </SelectItem>
                        <SelectItem value="4h_matutino">4H MATUTINO (08:00-12:00)</SelectItem>
                        <SelectItem value="seg_dom_0630_1550">SEG-DOM 06:30-15:50</SelectItem>
                    </SelectContent>
                </Select>
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

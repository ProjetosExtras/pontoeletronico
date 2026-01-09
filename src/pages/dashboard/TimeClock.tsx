import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { EditEntryDialog } from "@/components/dashboard/EditEntryDialog";
import { ImportEntriesDialog } from "@/components/dashboard/ImportEntriesDialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

type EmployeeOption = {
  id: string;
  name: string;
};

type TimeEntryRow = {
  id: string;
  timestamp: string;
  type: string;
  location_lat?: number | null;
  location_long?: number | null;
  nsr?: number | null;
  employees?: { name?: string | null } | null;
  justification?: string | null;
  employee_id?: string;
};

const TimeClock = () => {
  const [entries, setEntries] = useState<TimeEntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [selectedEmployee, selectedMonth]);

  const fetchEmployees = async () => {
      try {
          const { data: { user } } = await supabase.auth.getUser();
          const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user?.id).single();
          
          if (profile?.company_id) {
              const { data } = await supabase
                  .from('employees')
                  .select('id, name')
                  .eq('company_id', profile.company_id)
                  .order('name');
              setEmployees(data || []);
          }
      } catch (error) {
          console.error("Error fetching employees:", error);
      }
  };

  const fetchEntries = async () => {
    setLoading(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user?.id).single();

        if (!profile?.company_id) return;

        let query = supabase
            .from('time_entries')
            .select(`
                *,
                employees ( name )
            `)
            .eq('company_id', profile.company_id)
            .order('timestamp', { ascending: false });

        // Filter by Employee
        if (selectedEmployee && selectedEmployee !== 'all') {
            query = query.eq('employee_id', selectedEmployee);
        }

        // Filter by Month
        if (selectedMonth) {
            const [year, month] = selectedMonth.split('-').map(Number);
            const startDate = startOfMonth(new Date(year, month - 1));
            const endDate = endOfMonth(new Date(year, month - 1));
            
            query = query
                .gte('timestamp', startDate.toISOString())
                .lte('timestamp', endDate.toISOString());
        } else {
            // Default limit if no filter
             query = query.limit(50);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        // Deduplicate entries based on employee_id and timestamp (visual deduplication)
        const uniqueEntries: TimeEntryRow[] = [];
        const seen = new Set();
        
        if (data) {
            data.forEach((entry: any) => {
                const key = `${entry.employee_id}|${new Date(entry.timestamp).toISOString()}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueEntries.push(entry);
                }
            });
        }

        setEntries(uniqueEntries);
    } catch (error) {
        console.error("Error fetching entries:", error);
    } finally {
        setLoading(false);
    }
  };

  const getBadgeColor = (type: string) => {
      switch (type) {
          case 'entrada': return 'bg-green-500';
          case 'saida': return 'bg-red-500';
          case 'intervalo': return 'bg-yellow-500';
          case 'retorno': return 'bg-blue-500';
          case 'abono': return 'bg-purple-500';
          default: return 'bg-gray-500';
      }
  };

  const handleClearImports = async () => {
    try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user?.id).single();
        
        if (!profile?.company_id) return;

        let query = supabase
            .from('time_entries')
            .delete()
            .eq('company_id', profile.company_id)
            .eq('device_info', 'Importação Excel');

        // Apply month filter to deletion as well to be safe/consistent with view
        if (selectedMonth) {
            const [year, month] = selectedMonth.split('-').map(Number);
            const startDate = startOfMonth(new Date(year, month - 1));
            const endDate = endOfMonth(new Date(year, month - 1));
            
            query = query
                .gte('timestamp', startDate.toISOString())
                .lte('timestamp', endDate.toISOString());
        }

        const { data: deletedData, error } = await query.select();

        if (error) throw error;

        if (!deletedData || deletedData.length === 0) {
             toast.warning("Nenhum registro foi excluído. Verifique se existem importações neste mês ou se você tem permissão.");
        } else {
             toast.success(`${deletedData.length} importações excluídas com sucesso!`);
        }
        
        fetchEntries();
    } catch (error) {
        console.error("Error clearing imports:", error);
        toast.error("Erro ao excluir importações.");
    } finally {
        setLoading(false);
        setIsClearDialogOpen(false);
    }
  };

  const handleDeleteEntry = async () => {
    if (!entryToDelete) return;
    try {
        const { error } = await supabase
            .from('time_entries')
            .delete()
            .eq('id', entryToDelete);

        if (error) throw error;
        
        toast.success("Registro excluído com sucesso!");
        fetchEntries();
    } catch (error) {
        console.error("Error deleting entry:", error);
        toast.error("Erro ao excluir registro.");
    } finally {
        setEntryToDelete(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Registros de Ponto</h2>
          <p className="text-muted-foreground">Monitoramento e histórico de marcações.</p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="destructive" onClick={() => setIsClearDialogOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Limpar Importações
            </Button>
            <ImportEntriesDialog />
        </div>
      </div>

      <AlertDialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar Importações?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação excluirá todas as marcações identificadas como "Importação Excel" 
              {selectedMonth ? ` no mês de ${selectedMonth}` : ""}. 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearImports} className="bg-red-500 hover:bg-red-600">
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!entryToDelete} onOpenChange={(open) => !open && setEntryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este registro de ponto? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEntry} className="bg-red-500 hover:bg-red-600">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="mb-6">
        <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="space-y-2 w-full md:w-[300px]">
                    <label className="text-sm font-medium">Funcionário</label>
                    <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                        <SelectTrigger>
                            <SelectValue placeholder="Todos os funcionários" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os funcionários</SelectItem>
                            {employees.map((emp) => (
                                <SelectItem key={emp.id} value={emp.id}>
                                    {emp.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2 w-full md:w-[200px]">
                    <label className="text-sm font-medium">Mês de Referência</label>
                    <Input 
                        type="month" 
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                    />
                </div>

                <Button variant="outline" onClick={() => {
                    setSelectedEmployee("all");
                    setSelectedMonth(format(new Date(), 'yyyy-MM'));
                }} title="Limpar Filtros">
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </CardContent>
      </Card>

      <Card>
          <CardHeader>
              <CardTitle>
                  {selectedEmployee !== 'all' 
                    ? `Histórico: ${employees.find(e => e.id === selectedEmployee)?.name}` 
                    : 'Últimas Marcações'}
              </CardTitle>
          </CardHeader>
          <CardContent>
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Funcionário</TableHead>
                          <TableHead>Data/Hora</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Localização</TableHead>
                          <TableHead>NSR</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {loading ? (
                          <TableRow>
                              <TableCell colSpan={6} className="text-center py-4">Carregando...</TableCell>
                          </TableRow>
                      ) : entries.length === 0 ? (
                          <TableRow>
                              <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">Nenhum registro encontrado.</TableCell>
                          </TableRow>
                      ) : (
                          entries.map((entry) => (
                              <TableRow key={entry.id}>
                                  <TableCell className="font-medium">{entry.employees?.name || 'Desconhecido'}</TableCell>
                                  <TableCell>
                                    {format(new Date(entry.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                                    {entry.justification && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                            Obs: {entry.justification}
                                        </div>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                      <Badge className={getBadgeColor(entry.type)}>{entry.type.toUpperCase()}</Badge>
                                  </TableCell>
                                  <TableCell>
                                      {entry.location_lat ? 'GPS' : 'IP'}
                                  </TableCell>
                                  <TableCell className="font-mono text-xs">{entry.nsr || '-'}</TableCell>
                                  <TableCell className="text-right">
                                      <div className="flex justify-end gap-2">
                                          <EditEntryDialog entry={entry} onUpdate={fetchEntries} />
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={() => setEntryToDelete(entry.id)}
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                            title="Excluir"
                                          >
                                              <Trash2 className="h-4 w-4" />
                                          </Button>
                                      </div>
                                  </TableCell>
                              </TableRow>
                          ))
                      )}
                  </TableBody>
              </Table>
          </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default TimeClock;

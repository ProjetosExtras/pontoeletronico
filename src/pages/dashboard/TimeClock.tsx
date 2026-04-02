import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, differenceInCalendarDays } from "date-fns";
import { EditEntryDialog } from "@/components/dashboard/EditEntryDialog";
import { CreateEntryDialog } from "@/components/dashboard/CreateEntryDialog";
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
  shift_type?: string | null;
  admission_date?: string | null;
};

type TimeEntryRow = {
  id: string;
  timestamp: string;
  type: string;
  location_lat?: number | null;
  location_long?: number | null;
  nsr?: number | null;
  employees?: { name?: string | null; code?: string | null } | null;
  justification?: string | null;
  employee_id?: string;
  is_manual?: boolean;
};

const TimeClock = () => {
  const [entries, setEntries] = useState<TimeEntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [selectedEmployee, selectedMonth, selectedDay]);

  const fetchEmployees = async () => {
      try {
          const { data: { user } } = await supabase.auth.getUser();
          const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user?.id).single();
          
          if (profile?.company_id) {
              const { data } = await supabase
                  .from('employees')
                  .select('id, name, shift_type, admission_date')
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
                employees ( name, code )
            `)
            .eq('company_id', profile.company_id)
            .order('timestamp', { ascending: false })
            .order('created_at', { ascending: false }); // Secondary sort for stability

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

        // Filter by specific Day (overrides month range within that day)
        if (selectedDay) {
            const startDate = new Date(`${selectedDay}T00:00:00`);
            const endDate = new Date(`${selectedDay}T23:59:59.999`);
            query = query
                .gte('timestamp', startDate.toISOString())
                .lte('timestamp', endDate.toISOString());
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        // Deduplicate logic: Hide entries that are likely double-punches (same employee, same type, within 5 minutes)
        // Data is sorted by timestamp DESC (latest first)
        const rawEntries = (data as TimeEntryRow[]) || [];
        const cleanedEntries: TimeEntryRow[] = [];
        const lastSeenMap = new Map<string, Date>(); // Key: "empId-date-type", Value: Timestamp

        for (const entry of rawEntries) {
            if (!entry.employee_id) {
                cleanedEntries.push(entry);
                continue;
            }

            const entryDate = new Date(entry.timestamp);
            const dateStr = format(entryDate, 'yyyy-MM-dd');
            // Key scope: Employee + Day + Type
            const key = `${entry.employee_id}-${dateStr}-${entry.type}`;
            
            if (lastSeenMap.has(key)) {
                const lastDate = lastSeenMap.get(key)!;
                const diffMinutes = Math.abs(lastDate.getTime() - entryDate.getTime()) / 60000;
                
                // If same type on same day and within 10 minutes, skip (show only the latest one)
                if (diffMinutes < 10) {
                    continue;
                }
            }
            
            lastSeenMap.set(key, entryDate);
            cleanedEntries.push(entry);
        }

        const uniqueEntries = cleanedEntries;

        // Apply night shift display logic (Entry, Break, Return, Exit) for sequence of 4
        // IDs: 10, 14, 26, 31
        const targetCodes = ['10', '14', '26', '31'];
        
        // Group by employee and shift (roughly)
        // We will process the full uniqueEntries list (descending)
        // Re-sort ascending to find sequences easily, then restore
        const sortedAsc = [...uniqueEntries].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
        const processedEntries: TimeEntryRow[] = [];
        let buffer: TimeEntryRow[] = [];
        
        for (const entry of sortedAsc) {
             const empCode = entry.employees?.code;
             
             // If not target employee, just push
             if (!empCode || !targetCodes.includes(empCode)) {
                 processedEntries.push(entry);
                 continue;
             }

             // Check if entry belongs to current buffer (shift)
             // Buffer belongs to a shift if time difference is small (< 12h from first entry of buffer)
             // or < 8h from last entry
             if (buffer.length === 0) {
                 buffer.push(entry);
             } else {
                 const lastInBuffer = buffer[buffer.length - 1];
                 const diffHours = (new Date(entry.timestamp).getTime() - new Date(lastInBuffer.timestamp).getTime()) / (1000 * 60 * 60);
                 
                 if (diffHours < 14) { // 12x36 shift usually fits within 14h window (19h to 07h+delay)
                     buffer.push(entry);
                 } else {
                     // Flush buffer
                     if (buffer.length === 4) {
                         // Assign types: Entrada, Intervalo, Retorno, Saida
                         buffer[0].type = 'entrada';
                         buffer[1].type = 'intervalo';
                         buffer[2].type = 'retorno';
                         buffer[3].type = 'saida';
                     }
                     processedEntries.push(...buffer);
                     buffer = [entry];
                 }
             }
        }
        // Flush remaining
        if (buffer.length > 0) {
            if (buffer.length === 4) {
                 buffer[0].type = 'entrada';
                 buffer[1].type = 'intervalo';
                 buffer[2].type = 'retorno';
                 buffer[3].type = 'saida';
            }
            processedEntries.push(...buffer);
        }

        // Restore descending sort
        const finalEntries = processedEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // If a specific employee and month are selected (and no specific day), fill in missing days
        if (selectedEmployee && selectedEmployee !== 'all' && selectedMonth && !selectedDay) {
            const [year, month] = selectedMonth.split('-').map(Number);
            const start = startOfMonth(new Date(year, month - 1));
            const end = endOfMonth(new Date(year, month - 1));
            const days = eachDayOfInterval({ start, end });
            
            // Get employee name
            const emp = employees.find(e => e.id === selectedEmployee);
            const empName = emp?.name || 'Desconhecido';
            const empShift = emp?.shift_type || null;
            const empAdmissionDate = emp?.admission_date ? new Date(emp.admission_date) : null;

            const entriesByDate = new Map<string, TimeEntryRow[]>();
            finalEntries.forEach(e => {
                const dateKey = format(new Date(e.timestamp), 'yyyy-MM-dd');
                if (!entriesByDate.has(dateKey)) entriesByDate.set(dateKey, []);
                entriesByDate.get(dateKey)!.push(e);
            });

            const fullList: TimeEntryRow[] = [];
            // Sort days descending to match default view
            days.reverse().forEach(day => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayEntries = entriesByDate.get(dateKey);

                if (dayEntries && dayEntries.length > 0) {
                    fullList.push(...dayEntries);
                } else {
                    let isWorkDay = true;
                    if (empShift === '12x36') {
                        const anchor = empAdmissionDate || start;
                        const diff = Math.abs(differenceInCalendarDays(day, anchor));
                        isWorkDay = diff % 2 === 0;
                    }
                    if (isWorkDay) {
                        fullList.push({
                            id: `placeholder-${dateKey}`,
                            timestamp: `${dateKey}T00:00:00`,
                            type: 'empty',
                            employee_id: selectedEmployee,
                            employees: { name: empName }
                        });
                    }
                }
            });
            setEntries(fullList);
        } else {
            setEntries(finalEntries);
        }
    } catch (error) {
        console.error("Error fetching entries:", error);
    } finally {
        setLoading(false);
    }
  };

  const getDisplayType = (entry: TimeEntryRow) => {
      if (entry.type === 'empty') return 'empty';

      // Respeitar marcações manuais (não aplicar lógica automática de turno)
      if (entry.is_manual) return entry.type;

      // Priority: If the entry type has been explicitly set to 'intervalo' or 'retorno' (e.g. by 4-markings logic),
      // we respect it and do NOT override based on hour.
      if (entry.type === 'intervalo' || entry.type === 'retorno') {
          return entry.type;
      }
      
      // Check for specific night shift employees (IDs 10, 14, 26, 31)
      const targetCodes = ['10', '14', '26', '31'];
      const empCode = entry.employees?.code;
      
      if (empCode && targetCodes.includes(empCode)) {
          const date = new Date(entry.timestamp);
          const hour = date.getHours();
          
          // If it's around 7 AM (06:00 - 09:00), force it to be SAIDA
          if (hour >= 6 && hour < 9) {
              return 'saida';
          }
          
          // If it's around 7 PM (18:00 - 21:00), force it to be ENTRADA
          if (hour >= 18 && hour < 21) {
              return 'entrada';
          }

          // Break window (23:00 - 05:00) - Map Saida->Intervalo and Entrada->Retorno
          if (hour >= 23 || hour < 5) {
              if (entry.type === 'saida') return 'intervalo';
              if (entry.type === 'entrada') return 'retorno';
          }
      }
      
      return entry.type;
  };

  const getBadgeColor = (type: string) => {
      switch (type) {
          case 'entrada': return 'bg-green-500';
          case 'saida': return 'bg-red-500';
          case 'intervalo': return 'bg-yellow-500';
          case 'retorno': return 'bg-blue-500';
          case 'abono': return 'bg-purple-500';
          case 'empty': return 'bg-gray-200 text-gray-500 hover:bg-gray-300';
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

  const handleDeleteEntry = async (idToDelete: string) => {
    try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('id', user?.id)
            .single();

        if (!profile?.company_id) {
            toast.error("Empresa não encontrada para este usuário.");
            setLoading(false);
            return;
        }

        const { data, error } = await supabase
            .from('time_entries')
            .delete()
            .eq('id', idToDelete)
            .eq('company_id', profile.company_id)
            .select();

        if (error) throw error;

        if (!data || data.length === 0) {
            toast.warning("Nenhum registro foi excluído. Verifique se o registro ainda existe.");
        } else {
            toast.success("Registro excluído com sucesso!");
        }

        await fetchEntries();
    } catch (error) {
        console.error("Error deleting entry:", error);
        toast.error("Erro ao excluir registro.");
        setLoading(false);
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
            <CreateEntryDialog 
                onSuccess={fetchEntries} 
                preSelectedEmployeeId={selectedEmployee} 
                preSelectedDate={selectedDay || undefined}
            />
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
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <Button 
                variant="destructive" 
                onClick={() => {
                    if (entryToDelete) {
                        handleDeleteEntry(entryToDelete);
                    }
                }}
                disabled={loading}
            >
              {loading ? "Excluindo..." : "Excluir"}
            </Button>
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

                <div className="space-y-2 w-full md:w-[200px]">
                    <label className="text-sm font-medium">Dia</label>
                    <Input 
                        type="date"
                        lang="pt-BR"
                        value={selectedDay}
                        onChange={(e) => {
                            const value = e.target.value;
                            setSelectedDay(value);
                            if (value) {
                                const [year, month] = value.split("-");
                                setSelectedMonth(`${year}-${month}`);
                            }
                        }}
                    />
                </div>

                <Button variant="outline" onClick={() => {
                    setSelectedEmployee("all");
                    setSelectedMonth(format(new Date(), 'yyyy-MM'));
                    setSelectedDay("");
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
                          entries.map((entry) => {
                              const displayType = getDisplayType(entry);
                              return (
                              <TableRow key={entry.id} className={displayType === 'empty' ? 'bg-gray-50/50' : ''}>
                                  <TableCell className="font-medium">{entry.employees?.name || 'Desconhecido'}</TableCell>
                                  <TableCell>
                                    {displayType === 'empty' ? (
                                      <span className="text-muted-foreground">{format(new Date(entry.timestamp), 'dd/MM/yyyy')} - Sem marcações</span>
                                    ) : (
                                      <>
                                      {format(new Date(entry.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                                      {entry.justification && (
                                          <div className="text-xs text-muted-foreground mt-1">
                                              Obs: {entry.justification}
                                          </div>
                                      )}
                                      </>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                      <Badge className={getBadgeColor(displayType)}>
                                        {displayType === 'empty' ? 'FALTA/FOLGA' : displayType.toUpperCase()}
                                      </Badge>
                                  </TableCell>
                                  <TableCell>
                                      {displayType === 'empty' ? '-' : (entry.location_lat ? 'GPS' : 'IP')}
                                  </TableCell>
                                  <TableCell className="font-mono text-xs">{entry.nsr || '-'}</TableCell>
                                  <TableCell className="text-right">
                                      <div className="flex justify-end gap-2">
                                          {entry.type === 'empty' ? (
                                            <CreateEntryDialog 
                                              onSuccess={fetchEntries} 
                                              preSelectedEmployeeId={selectedEmployee} 
                                              preSelectedDate={format(new Date(entry.timestamp), 'yyyy-MM-dd')}
                                            />
                                          ) : (
                                            <>
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
                                            </>
                                          )}
                                      </div>
                                  </TableCell>
                              </TableRow>
                          );
                        })
                      )}
                  </TableBody>
              </Table>
          </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default TimeClock;

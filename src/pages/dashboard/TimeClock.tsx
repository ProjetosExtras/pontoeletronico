import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { format, startOfMonth, endOfMonth } from "date-fns";
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
import { Search, X } from "lucide-react";

const TimeClock = () => {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));

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
        setEntries(data || []);
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
          default: return 'bg-gray-500';
      }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Registros de Ponto</h2>
          <p className="text-muted-foreground">Monitoramento e histórico de marcações.</p>
        </div>
        <ImportEntriesDialog />
      </div>

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
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {loading ? (
                          <TableRow>
                              <TableCell colSpan={5} className="text-center py-4">Carregando...</TableCell>
                          </TableRow>
                      ) : entries.length === 0 ? (
                          <TableRow>
                              <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">Nenhum registro encontrado.</TableCell>
                          </TableRow>
                      ) : (
                          entries.map((entry) => (
                              <TableRow key={entry.id}>
                                  <TableCell className="font-medium">{entry.employees?.name || 'Desconhecido'}</TableCell>
                                  <TableCell>{format(new Date(entry.timestamp), 'dd/MM/yyyy HH:mm:ss')}</TableCell>
                                  <TableCell>
                                      <Badge className={getBadgeColor(entry.type)}>{entry.type.toUpperCase()}</Badge>
                                  </TableCell>
                                  <TableCell>
                                      {entry.location_lat ? 'GPS' : 'IP'}
                                  </TableCell>
                                  <TableCell className="font-mono text-xs">{entry.nsr || '-'}</TableCell>
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

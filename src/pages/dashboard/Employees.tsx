import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { Search, Edit, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { EmployeeFormDialog } from "@/components/dashboard/EmployeeFormDialog";
import { toast } from "sonner";

type Employee = {
  id: string;
  name: string;
  code: string | null;
  cpf?: string | null;
  pis?: string | null;
  job_title?: string | null;
  admission_date?: string | null;
  pin?: string | null;
  shift_type?: '12x36' | 'standard' | '12x36_noturno' | '3h_diurno';
};

const Employees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const filteredEmployees = employees.filter(employee => 
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (employee.code && employee.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();
        
      if (!profile?.company_id) return;

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('name');
      
      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return;
    
    try {
      // Delete related time entries first
      const { error: timeEntriesError } = await supabase
        .from('time_entries')
        .delete()
        .eq('employee_id', employeeToDelete.id);

      if (timeEntriesError) throw timeEntriesError;

      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', employeeToDelete.id);
        
      if (error) throw error;
      
      toast.success("Funcionário excluído com sucesso!");
      fetchEmployees();
    } catch (error) {
      console.error("Error deleting employee:", error);
      toast.error("Erro ao excluir funcionário.");
    } finally {
      setEmployeeToDelete(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Funcionários</h2>
        <EmployeeFormDialog onSuccess={fetchEmployees} />
      </div>

      <EmployeeFormDialog 
        open={isEditDialogOpen} 
        onOpenChange={setIsEditDialogOpen}
        employeeToEdit={editingEmployee}
        onSuccess={() => {
            fetchEmployees();
            setIsEditDialogOpen(false);
            setEditingEmployee(null);
        }}
      />

      <AlertDialog open={!!employeeToDelete} onOpenChange={(open) => !open && setEmployeeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Isso excluirá permanentemente o funcionário {employeeToDelete?.name} e todos os seus dados associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEmployee} className="bg-red-500 hover:bg-red-600">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center mb-4">
        <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por nome ou matrícula..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Matrícula</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Escala</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
                <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">Carregando...</TableCell>
                </TableRow>
            ) : filteredEmployees.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum funcionário encontrado.</TableCell>
                </TableRow>
            ) : (
                filteredEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell>{employee.code}</TableCell>
                    <TableCell>{employee.cpf || '-'}</TableCell>
                    <TableCell>{employee.job_title || '-'}</TableCell>
                    <TableCell>
                        {employee.shift_type === '12x36' ? (
                            <Badge variant="secondary" className="bg-purple-100 text-purple-800 hover:bg-purple-100">12x36</Badge>
                        ) : employee.shift_type === '12x36_noturno' ? (
                            <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100">12x36 Noturno</Badge>
                        ) : employee.shift_type === '3h_diurno' ? (
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">3h Diurno</Badge>
                        ) : (
                            <Badge variant="outline">Normal</Badge>
                        )}
                    </TableCell>
                    <TableCell className="text-right">
                        <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                                setEditingEmployee(employee);
                                setIsEditDialogOpen(true);
                            }}
                        >
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-500 hover:text-red-600"
                            onClick={() => setEmployeeToDelete(employee)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  );
};

export default Employees;

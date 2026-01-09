import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Edit, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { EmployeeFormDialog } from "@/components/dashboard/EmployeeFormDialog";

const Employees = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
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

      <div className="flex items-center mb-4">
        <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por nome ou matrícula..."
              className="pl-8"
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
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
                <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">Carregando...</TableCell>
                </TableRow>
            ) : employees.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum funcionário encontrado.</TableCell>
                </TableRow>
            ) : (
                employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell>{employee.code}</TableCell>
                    <TableCell>{employee.cpf || '-'}</TableCell>
                    <TableCell>{employee.job_title || '-'}</TableCell>
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
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600">
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

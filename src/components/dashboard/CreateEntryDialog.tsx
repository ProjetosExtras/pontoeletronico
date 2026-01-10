import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const formSchema = z.object({
  employee_id: z.string().min(1, "Funcionário é obrigatório"),
  date: z.string().min(1, "Data é obrigatória"),
  time: z.string().min(1, "Hora é obrigatória"),
  type: z.string().min(1, "Tipo é obrigatório"),
  justification: z.string().optional(),
});

interface CreateEntryDialogProps {
  onSuccess: () => void;
  preSelectedEmployeeId?: string;
  preSelectedDate?: string;
}

export function CreateEntryDialog({ onSuccess, preSelectedEmployeeId, preSelectedDate }: CreateEntryDialogProps) {
  const [open, setOpen] = useState(false);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employee_id: preSelectedEmployeeId && preSelectedEmployeeId !== 'all' ? preSelectedEmployeeId : "",
      date: preSelectedDate || new Date().toISOString().split('T')[0],
      time: "08:00",
      type: "entrada",
      justification: "",
    },
  });

  useEffect(() => {
    if (open) {
      fetchEmployees();
      if (preSelectedEmployeeId && preSelectedEmployeeId !== 'all') {
        form.setValue('employee_id', preSelectedEmployeeId);
      }
      if (preSelectedDate) {
        form.setValue('date', preSelectedDate);
      }
    }
  }, [open, preSelectedEmployeeId, preSelectedDate]);

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

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user?.id).single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      // Get latest NSR
      const { data: lastEntry } = await supabase
        .from('time_entries')
        .select('nsr')
        .eq('company_id', profile.company_id)
        .order('nsr', { ascending: false })
        .limit(1)
        .single();
      
      const nextNsr = (lastEntry?.nsr || 0) + 1;
      const timestamp = new Date(`${values.date}T${values.time}:00`).toISOString();

      const { error } = await supabase
        .from("time_entries")
        .insert({
          company_id: profile.company_id,
          employee_id: values.employee_id,
          timestamp: timestamp,
          type: values.type,
          justification: values.justification,
          nsr: nextNsr,
          device_info: "Manual Web",
          is_manual: true
        });

      if (error) throw error;

      toast.success("Registro adicionado com sucesso!");
      setOpen(false);
      form.reset({
        employee_id: preSelectedEmployeeId && preSelectedEmployeeId !== 'all' ? preSelectedEmployeeId : "",
        date: new Date().toISOString().split('T')[0],
        time: "08:00",
        type: "entrada",
        justification: "",
      });
      onSuccess();
    } catch (error) {
      console.error("Erro ao adicionar registro:", error);
      toast.error("Erro ao adicionar registro.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar Manual
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Registro Manual</DialogTitle>
          <DialogDescription>
            Insira uma nova marcação de ponto ou abono.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <FormField
              control={form.control}
              name="employee_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Funcionário</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o funcionário" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Marcação</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="entrada">Entrada</SelectItem>
                      <SelectItem value="saida">Saída</SelectItem>
                      <SelectItem value="intervalo">Intervalo</SelectItem>
                      <SelectItem value="retorno">Retorno</SelectItem>
                      <SelectItem value="abono">Abono / Justificativa</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="justification"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Justificativa / Observação</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Atestado médico, Falta justificada..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit">Adicionar Registro</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

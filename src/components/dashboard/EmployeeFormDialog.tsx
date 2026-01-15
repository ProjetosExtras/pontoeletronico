import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/lib/supabase";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  code: z.string().min(1, "Matrícula é obrigatória"),
  cpf: z.string().min(11, "CPF inválido").max(14, "CPF inválido"), // Basic length check
  pis: z.string().min(11, "PIS inválido").max(14, "PIS inválido"),
  job_title: z.string().min(2, "Cargo é obrigatório"),
  admission_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Data inválida",
  }),
  pin: z.string().optional(),
  shift_type: z.enum([
    "standard",
    "12x36",
    "12x36_noturno",
    "3h_diurno",
    "standard_09_18",
    "seg_qui_sab_7_16_sex_7_11",
    "seg_sex_07_16_sab_08_12",
    "4h_matutino",
    "seg_sex_08_11",
    "seg_sex_08_12",
  ]).default("standard"),
  work_shift_id: z.string().optional().nullable(),
});

interface EmployeeFormDialogProps {
  onSuccess: () => void;
  employeeToEdit?: any;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function EmployeeFormDialog({ onSuccess, employeeToEdit, open: controlledOpen, onOpenChange: setControlledOpen }: EmployeeFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [workShifts, setWorkShifts] = useState<any[]>([]);

  useEffect(() => {
    async function fetchShifts() {
        const { data } = await supabase.from('work_shifts').select('id, name').order('name');
        if (data) setWorkShifts(data);
    }
    fetchShifts();
  }, []);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen! : setInternalOpen;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      code: "",
      cpf: "",
      pis: "",
      job_title: "",
      admission_date: new Date().toISOString().split("T")[0],
      pin: "",
    },
  });

  useEffect(() => {
    if (employeeToEdit) {
      form.reset({
        name: employeeToEdit.name,
        code: employeeToEdit.code,
        cpf: employeeToEdit.cpf || "",
        pis: employeeToEdit.pis || "",
        job_title: employeeToEdit.job_title || "",
        admission_date: employeeToEdit.admission_date ? employeeToEdit.admission_date.split("T")[0] : new Date().toISOString().split("T")[0],
        pin: employeeToEdit.pin || "",
        shift_type: employeeToEdit.shift_type || "standard",
        work_shift_id: employeeToEdit.work_shift_id || null,
      });
    } else {
        form.reset({
            name: "",
            code: "",
            cpf: "",
            pis: "",
            job_title: "",
            admission_date: new Date().toISOString().split("T")[0],
            pin: "",
            shift_type: "standard",
            work_shift_id: null,
        });
    }
  }, [employeeToEdit, form, open]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      // Get current user's company
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      // Check if code already exists for this company
      const { data: existing } = await supabase
        .from("employees")
        .select("id")
        .eq("company_id", profile.company_id)
        .eq("code", values.code)
        .single();

      if (existing && existing.id !== employeeToEdit?.id) {
        throw new Error("Já existe um funcionário com esta matrícula");
      }

      if (employeeToEdit) {
        // UPDATE
        const { error } = await supabase
          .from("employees")
          .update({
            name: values.name,
            code: values.code,
            cpf: values.cpf.replace(/\D/g, ""),
            pis: values.pis.replace(/\D/g, ""),
            job_title: values.job_title,
            admission_date: values.admission_date,
            pin: values.pin || null,
            shift_type: values.shift_type,
            work_shift_id: values.work_shift_id,
          })
          .eq("id", employeeToEdit.id);

        if (error) throw error;
        toast.success("Funcionário atualizado com sucesso!");
      } else {
        // INSERT
        const { error } = await supabase.from("employees").insert({
          company_id: profile.company_id,
          name: values.name,
          code: values.code,
          cpf: values.cpf.replace(/\D/g, ""),
          pis: values.pis.replace(/\D/g, ""),
          job_title: values.job_title,
          admission_date: values.admission_date,
          pin: values.pin || null,
          shift_type: values.shift_type,
          work_shift_id: values.work_shift_id,
        });

        if (error) throw error;
        toast.success("Funcionário cadastrado com sucesso!");
      }

      setOpen(false);
      form.reset();
      onSuccess();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao salvar funcionário");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Novo Funcionário
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{employeeToEdit ? "Editar Funcionário" : "Novo Funcionário"}</DialogTitle>
          <DialogDescription>
            {employeeToEdit
              ? "Edite os dados do funcionário abaixo."
              : "Preencha os dados abaixo para cadastrar um novo funcionário."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: João da Silva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cpf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF</FormLabel>
                    <FormControl>
                      <Input placeholder="000.000.000-00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PIS</FormLabel>
                    <FormControl>
                      <Input placeholder="000.00000.00-0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Matrícula</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 00123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="admission_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Admissão</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <FormField
                control={form.control}
                name="job_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cargo / Função</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Assistente Administrativo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="pin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PIN (Opcional)</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Para registro por PIN" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="shift_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Escala (Padrão)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a escala" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="work_shift_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Escala Personalizada</FormLabel>
                    <Select 
                        onValueChange={(val) => field.onChange(val === "none" ? null : val)} 
                        value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione (Opcional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">-- Usar Padrão --</SelectItem>
                        {workShifts.map(ws => (
                            <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cadastrar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

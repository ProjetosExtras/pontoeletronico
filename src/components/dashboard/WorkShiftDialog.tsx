
import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const formSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  type: z.enum(["weekly", "12x36"]),
  // Campos auxiliares para construção do JSON
  start_time_12x36: z.string().optional(),
  end_time_12x36: z.string().optional(),
  // JSON final validado
  schedule_json: z.any().optional(),
});

interface WorkShiftDialogProps {
  onSuccess: () => void;
  shiftToEdit?: any;
  trigger?: React.ReactNode;
}

const DAYS_OF_WEEK = [
  { id: "1", label: "Segunda" },
  { id: "2", label: "Terça" },
  { id: "3", label: "Quarta" },
  { id: "4", label: "Quinta" },
  { id: "5", label: "Sexta" },
  { id: "6", label: "Sábado" },
  { id: "0", label: "Domingo" },
];

export function WorkShiftDialog({ onSuccess, shiftToEdit, trigger }: WorkShiftDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Estado local para gerenciar a grade semanal
  const [weeklySchedule, setWeeklySchedule] = useState<Record<string, { start: string; end: string; active: boolean }>>(() => {
    // Inicializa com todos os dias ativos e horários padrão
    const initial: any = {};
    DAYS_OF_WEEK.forEach(day => {
      initial[day.id] = { start: "08:00", end: "17:00", active: true };
    });
    return initial;
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "weekly",
      start_time_12x36: "07:00",
      end_time_12x36: "19:00",
    },
  });

  // Carregar dados se for edição
  useState(() => {
    if (shiftToEdit) {
      form.reset({
        name: shiftToEdit.name,
        type: shiftToEdit.type,
      });
      
      if (shiftToEdit.type === 'weekly') {
        const savedSchedule = shiftToEdit.schedule_json || {};
        const newSchedule: any = {};
        DAYS_OF_WEEK.forEach(day => {
          if (savedSchedule[day.id]) {
            newSchedule[day.id] = { ...savedSchedule[day.id], active: true };
          } else {
             newSchedule[day.id] = { start: "08:00", end: "17:00", active: false };
          }
        });
        setWeeklySchedule(newSchedule);
      } else if (shiftToEdit.type === '12x36') {
         const savedSchedule = shiftToEdit.schedule_json || {};
         form.setValue('start_time_12x36', savedSchedule.start || "07:00");
         form.setValue('end_time_12x36', savedSchedule.end || "19:00");
      }
    }
  });

  const shiftType = form.watch("type");

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Montar o JSON de agendamento
      let schedule_json = {};

      if (values.type === '12x36') {
        schedule_json = {
          start: values.start_time_12x36,
          end: values.end_time_12x36
        };
      } else {
        // Filtrar apenas dias ativos
        Object.entries(weeklySchedule).forEach(([day, config]) => {
          if (config.active) {
            // @ts-ignore
            schedule_json[day] = { start: config.start, end: config.end };
          }
        });
      }

      // Buscar company_id do usuário logado
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      const payload = {
        name: values.name,
        type: values.type,
        schedule_json: schedule_json,
        company_id: profile.company_id
      };

      let error;
      if (shiftToEdit) {
        const { error: updateError } = await supabase
          .from("work_shifts")
          .update(payload)
          .eq("id", shiftToEdit.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from("work_shifts")
          .insert([payload]);
        error = insertError;
      }

      if (error) throw error;

      toast.success(shiftToEdit ? "Escala atualizada!" : "Escala criada!");
      setOpen(false);
      form.reset();
      onSuccess();
    } catch (error: any) {
      toast.error("Erro ao salvar escala: " + error.message);
    } finally {
      setIsLoading(false);
    }
  }

  const updateDay = (dayId: string, field: 'start' | 'end' | 'active', value: any) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [dayId]: { ...prev[dayId], [field]: value }
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Nova Escala
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{shiftToEdit ? "Editar Escala" : "Nova Escala"}</DialogTitle>
          <DialogDescription>
            Defina os horários de trabalho para esta escala.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Escala</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Administrativo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="weekly">Semanal (Dias Fixos)</SelectItem>
                        <SelectItem value="12x36">12x36 (Revezamento)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {shiftType === '12x36' && (
              <div className="grid grid-cols-2 gap-4 p-4 border rounded-md bg-muted/20">
                <FormField
                  control={form.control}
                  name="start_time_12x36"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horário Entrada</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="end_time_12x36"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horário Saída</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {shiftType === 'weekly' && (
              <div className="space-y-2 border rounded-md p-4">
                <h3 className="font-medium text-sm mb-2">Horários por Dia da Semana</h3>
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day.id} className="flex items-center space-x-4 py-2 border-b last:border-0">
                    <div className="w-32 flex items-center space-x-2">
                      <Checkbox 
                        checked={weeklySchedule[day.id]?.active} 
                        onCheckedChange={(checked) => updateDay(day.id, 'active', checked)}
                      />
                      <span className={weeklySchedule[day.id]?.active ? "font-medium" : "text-muted-foreground"}>
                        {day.label}
                      </span>
                    </div>
                    
                    {weeklySchedule[day.id]?.active && (
                      <>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-muted-foreground">Entrada:</span>
                          <Input 
                            type="time" 
                            className="w-24 h-8" 
                            value={weeklySchedule[day.id]?.start}
                            onChange={(e) => updateDay(day.id, 'start', e.target.value)}
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-muted-foreground">Saída:</span>
                          <Input 
                            type="time" 
                            className="w-24 h-8" 
                            value={weeklySchedule[day.id]?.end}
                            onChange={(e) => updateDay(day.id, 'end', e.target.value)}
                          />
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Escala
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

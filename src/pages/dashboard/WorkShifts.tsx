
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { WorkShiftDialog } from "@/components/dashboard/WorkShiftDialog";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default function WorkShifts() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShifts();
  }, []);

  async function fetchShifts() {
    try {
      const { data, error } = await supabase
        .from("work_shifts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setShifts(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar escalas: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta escala?")) return;

    try {
      const { error } = await supabase
        .from("work_shifts")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Escala excluída com sucesso");
      fetchShifts();
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    }
  }

  const formatSchedule = (shift: any) => {
    if (shift.type === '12x36') {
      const s = shift.schedule_json;
      return `12x36 (${s?.start || '?'} - ${s?.end || '?'})`;
    }
    return "Semanal (Dias Fixos)";
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Escalas de Trabalho</h2>
        <WorkShiftDialog onSuccess={fetchShifts} />
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Detalhes</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                    <div className="flex justify-center">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                </TableCell>
              </TableRow>
            ) : shifts.length === 0 ? (
              <TableRow>
                 <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhuma escala cadastrada.
                 </TableCell>
              </TableRow>
            ) : (
              shifts.map((shift) => (
                <TableRow key={shift.id}>
                  <TableCell className="font-medium">{shift.name}</TableCell>
                  <TableCell>
                    {shift.type === '12x36' ? '12x36' : 'Semanal'}
                  </TableCell>
                  <TableCell>{formatSchedule(shift)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <WorkShiftDialog 
                          onSuccess={fetchShifts} 
                          shiftToEdit={shift}
                          trigger={
                              <Button variant="ghost" size="icon">
                                  <Pencil className="h-4 w-4" />
                              </Button>
                          }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(shift.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  );
}

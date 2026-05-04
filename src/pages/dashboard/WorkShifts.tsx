
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Trash2, Pencil, Link2, Unlink, Search } from "lucide-react";
import { toast } from "sonner";
import { WorkShiftDialog } from "@/components/dashboard/WorkShiftDialog";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

type WorkShift = {
  id: string;
  name: string;
  type: string;
  schedule_json?: unknown;
};

type EmployeeOption = {
  id: string;
  name: string;
  code?: string | null;
  work_shift_id?: string | null;
};

export default function WorkShifts() {
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [shiftToLink, setShiftToLink] = useState<WorkShift | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [shiftToView, setShiftToView] = useState<WorkShift | null>(null);

  useEffect(() => {
    fetchShifts();
  }, []);

  async function getCompanyId() {
    if (companyId) return companyId;
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user?.id)
      .single();
    if (profileError) throw profileError;
    const cid = profile?.company_id || null;
    setCompanyId(cid);
    return cid;
  }

  async function fetchEmployees(cid: string) {
    const { data, error } = await supabase
      .from("employees")
      .select("id, name, code, work_shift_id")
      .eq("company_id", cid)
      .order("name");
    if (error) throw error;
    setEmployees((data as EmployeeOption[]) || []);
  }

  async function fetchShifts() {
    try {
      const cid = await getCompanyId();
      if (!cid) throw new Error("Empresa não encontrada");

      const { data, error } = await supabase
        .from("work_shifts")
        .select("*")
        .eq("company_id", cid)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setShifts((data as WorkShift[]) || []);
      await fetchEmployees(cid);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Erro ao carregar escalas: " + message);
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Erro ao excluir: " + message);
    }
  }

  async function handleLinkEmployee(mode: "link" | "unlink") {
    try {
      const cid = await getCompanyId();
      if (!cid) throw new Error("Empresa não encontrada");
      if (!shiftToLink) throw new Error("Escala não selecionada");
      if (!selectedEmployeeId) throw new Error("Selecione um funcionário");

      const payload =
        mode === "link"
          ? { work_shift_id: shiftToLink.id }
          : { work_shift_id: null };

      const { error } = await supabase
        .from("employees")
        .update(payload)
        .eq("id", selectedEmployeeId)
        .eq("company_id", cid);

      if (error) throw error;

      toast.success(mode === "link" ? "Escala vinculada com sucesso!" : "Escala desvinculada com sucesso!");
      setLinkDialogOpen(false);
      setShiftToLink(null);
      setSelectedEmployeeId("");
      await fetchShifts();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error(message);
    }
  }

  const linkedCounts = employees.reduce<Record<string, number>>((acc, emp) => {
    if (emp.work_shift_id) {
      acc[emp.work_shift_id] = (acc[emp.work_shift_id] || 0) + 1;
    }
    return acc;
  }, {});

  const formatSchedule = (shift: WorkShift) => {
    if (shift.type === '12x36') {
      const s = shift.schedule_json as { start?: string; end?: string } | undefined;
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
              <TableHead>Vinculados</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex justify-center">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                </TableCell>
              </TableRow>
            ) : shifts.length === 0 ? (
              <TableRow>
                 <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
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
                  <TableCell>{linkedCounts[shift.id] || 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setShiftToView(shift);
                          setViewDialogOpen(true);
                        }}
                        title="Ver funcionários vinculados"
                      >
                        <Search className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setShiftToLink(shift);
                          setSelectedEmployeeId("");
                          setLinkDialogOpen(true);
                        }}
                        title="Vincular ao funcionário"
                      >
                        <Link2 className="h-4 w-4" />
                      </Button>
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

      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Vincular escala</DialogTitle>
            <DialogDescription>
              {shiftToLink ? `Escala: ${shiftToLink.name}` : "Selecione uma escala"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <div className="text-sm font-medium">Funcionário</div>
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o funcionário" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleLinkEmployee("unlink")}
              disabled={!selectedEmployeeId || !shiftToLink}
              title="Remove a escala personalizada e volta para a escala padrão do funcionário"
            >
              <Unlink className="mr-2 h-4 w-4" />
              Desvincular
            </Button>
            <Button
              onClick={() => handleLinkEmployee("link")}
              disabled={!selectedEmployeeId || !shiftToLink}
            >
              <Link2 className="mr-2 h-4 w-4" />
              Vincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={viewDialogOpen}
        onOpenChange={(open) => {
          setViewDialogOpen(open);
          if (!open) setShiftToView(null);
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Funcionários vinculados</DialogTitle>
            <DialogDescription>
              {shiftToView ? `Escala: ${shiftToView.name}` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Total:{" "}
              {shiftToView
                ? employees.filter((e) => e.work_shift_id === shiftToView.id).length
                : 0}
            </div>

            <div className="max-h-[320px] overflow-auto rounded-md border">
              {shiftToView ? (
                (() => {
                  const linked = employees.filter((e) => e.work_shift_id === shiftToView.id);
                  if (linked.length === 0) {
                    return (
                      <div className="p-4 text-sm text-muted-foreground">
                        Nenhum funcionário vinculado a esta escala.
                      </div>
                    );
                  }

                  return (
                    <div className="divide-y">
                      {linked.map((emp) => (
                        <div key={emp.id} className="flex items-center justify-between p-3">
                          <div className="text-sm font-medium">{emp.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {emp.code ? `Matrícula: ${emp.code}` : ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()
              ) : (
                <div className="p-4 text-sm text-muted-foreground">Selecione uma escala.</div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

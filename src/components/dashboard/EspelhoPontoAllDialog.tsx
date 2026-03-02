import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, Download, FileText } from "lucide-react";
import { generateEspelhoPDF } from "@/utils/generators";
import { toast } from "sonner";
import { format } from "date-fns";

export function EspelhoPontoAllDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));

  const handleGenerateAll = async () => {
    setLoading(true);
    try {
      await generateEspelhoPDF("all", selectedMonth, "auto");
      toast.success("Espelhos de Ponto gerados com sucesso!");
      setOpen(false);
    } catch (error: any) {
      toast.error(`Erro ao gerar PDF: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" variant="secondary">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Baixar Todos (Mês Atual)
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" />
            Baixar Espelhos de Ponto de Todos
          </DialogTitle>
          <DialogDescription>Selecione o mês para gerar os PDFs para todos os colaboradores.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Mês de Referência</label>
            <Input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleGenerateAll} disabled={loading || !selectedMonth}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Gerar Relatórios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

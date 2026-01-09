import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText, Loader2 } from "lucide-react";
import { generateAFD, generateAEJ } from "@/utils/generators";
import { useState } from "react";
import { toast } from "sonner";
import { EspelhoPontoDialog } from "@/components/dashboard/EspelhoPontoDialog";

const Reports = () => {
  const [loading, setLoading] = useState<string | null>(null);

  const handleGenerate = async (type: 'AFD' | 'AEJ') => {
    setLoading(type);
    try {
        if (type === 'AFD') await generateAFD();
        if (type === 'AEJ') await generateAEJ();
        
        toast.success(`Relatório ${type} gerado com sucesso!`);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Erro desconhecido.";
        toast.error(`Erro ao gerar ${type}: ${msg}`);
    } finally {
        setLoading(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Relatórios Fiscais</h2>
        <p className="text-muted-foreground">Emissão de arquivos exigidos pela Portaria 671/2021.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    AFD
                </CardTitle>
                <CardDescription>Arquivo Fonte de Dados</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                    Arquivo bruto contendo todos os registros de ponto. Obrigatório para fiscalização.
                </p>
                <Button 
                    className="w-full" 
                    variant="outline" 
                    onClick={() => handleGenerate('AFD')}
                    disabled={loading === 'AFD'}
                >
                    {loading === 'AFD' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Baixar AFD
                </Button>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-green-600" />
                    AEJ
                </CardTitle>
                <CardDescription>Arquivo Eletrônico de Jornada</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                    Substitui o antigo ACJEF. Contém dados de apuração da jornada para folha de pagamento.
                </p>
                <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => handleGenerate('AEJ')}
                    disabled={loading === 'AEJ'}
                >
                    {loading === 'AEJ' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Baixar AEJ
                </Button>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-purple-600" />
                    Espelho de Ponto
                </CardTitle>
                <CardDescription>Relatório Mensal</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                    Relatório detalhado em PDF para assinatura do colaborador.
                </p>
                <EspelhoPontoDialog />
            </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Reports;

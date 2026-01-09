import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState({
    name: "",
    cnpj: "",
    trade_name: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    legal_nature: "",
    state_registration: ""
  });

  useEffect(() => {
    fetchCompanyData();
  }, []);

  const fetchCompanyData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();
      
      if (profile?.company_id) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('*')
          .eq('id', profile.company_id)
          .single();
        
        if (companyData) {
            setCompany(prev => ({ ...prev, ...companyData }));
        }
      }
    } catch (error) {
      console.error("Error fetching company:", error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCompany(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
       const { data: { user } } = await supabase.auth.getUser();
       const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user?.id).single();
       
       if (profile?.company_id) {
           const { error } = await supabase
            .from('companies')
            .update({
                name: company.name,
                trade_name: company.trade_name,
                address: company.address,
                city: company.city,
                state: company.state,
                zip_code: company.zip_code,
                legal_nature: company.legal_nature,
                state_registration: company.state_registration
            })
            .eq('id', profile.company_id);
           
           if (error) throw error;
           toast.success("Dados atualizados com sucesso!");
       }
    } catch (error) {
        console.error("Error updating company:", error);
        toast.error("Erro ao salvar dados.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Configurações da Empresa</h2>
        <p className="text-muted-foreground">Mantenha os dados atualizados para conformidade com a Portaria 671.</p>
      </div>

      <div className="grid gap-6">
        <Card>
            <CardHeader>
                <CardTitle>Dados Cadastrais</CardTitle>
                <CardDescription>Informações jurídicas da empresa.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Razão Social</Label>
                        <Input id="name" name="name" value={company.name} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="trade_name">Nome Fantasia</Label>
                        <Input id="trade_name" name="trade_name" value={company.trade_name} onChange={handleChange} placeholder="Opcional" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="cnpj">CNPJ</Label>
                        <Input id="cnpj" name="cnpj" value={company.cnpj} disabled className="bg-muted" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="state_registration">Inscrição Estadual</Label>
                        <Input id="state_registration" name="state_registration" value={company.state_registration} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="legal_nature">Natureza Jurídica</Label>
                        <Input id="legal_nature" name="legal_nature" value={company.legal_nature} onChange={handleChange} />
                    </div>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Endereço</CardTitle>
                <CardDescription>Localização da sede da empresa.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="address">Logradouro Completo</Label>
                    <Input id="address" name="address" value={company.address} onChange={handleChange} placeholder="Rua, Número, Bairro" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="city">Cidade</Label>
                        <Input id="city" name="city" value={company.city} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="state">Estado (UF)</Label>
                        <Input id="state" name="state" value={company.state} onChange={handleChange} maxLength={2} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="zip_code">CEP</Label>
                        <Input id="zip_code" name="zip_code" value={company.zip_code} onChange={handleChange} />
                    </div>
                </div>
            </CardContent>
        </Card>

        <div className="flex justify-end">
            <Button onClick={handleSave} disabled={loading}>
                {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;

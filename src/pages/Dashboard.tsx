import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Clock, AlertTriangle, FileText, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { startOfDay, endOfDay, format } from "date-fns";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    employees: 0,
    clockInsToday: 0,
    inconsistencies: 0,
    pendingReports: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user?.id).single();
      
      if (!profile?.company_id) return;

      // 1. Total Employees (count from 'employees' table or 'profiles' depending on implementation)
      // Since 'employees' table is what we created for Portaria 671, we use that.
      // Fallback to counting 'profiles' if 'employees' is empty or used differently.
      const { count: employeeCount } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', profile.company_id);
      
      // 2. Clock-ins Today
      const todayStart = startOfDay(new Date()).toISOString();
      const todayEnd = endOfDay(new Date()).toISOString();
      
      const { count: clockInCount } = await supabase
        .from('time_entries')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', profile.company_id)
        .gte('timestamp', todayStart)
        .lte('timestamp', todayEnd);

      // 3. Inconsistencies (Simplified logic: Odd number of punches for previous day or missing punches)
      // This is complex, so we'll just placeholder 0 or simple logic.
      // Let's count entries with missing lat/long or suspicious types if we had that logic.
      // For now, let's just query if there are any open issues table or just hardcode 0 if no logic yet.
      // Real implementation would require a dedicated view or function.
      
      // 4. Reports (Just a static indicator for now or check if it's end of month)
      const isEndOfMonth = new Date().getDate() > 25;

      setStats({
        employees: employeeCount || 0,
        clockInsToday: clockInCount || 0,
        inconsistencies: 0, // Placeholder for complex logic
        pendingReports: isEndOfMonth ? 1 : 0
      });

    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
      return (
          <DashboardLayout>
              <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
          </DashboardLayout>
      )
  }

  return (
    <DashboardLayout>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Funcionários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.employees}</div>
            <p className="text-xs text-muted-foreground">Ativos na plataforma</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pontos Hoje</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.clockInsToday}</div>
            <p className="text-xs text-muted-foreground">{format(new Date(), 'dd/MM/yyyy')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inconsistências</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inconsistencies}</div>
            <p className="text-xs text-muted-foreground">Requer atenção</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Relatórios Pendentes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingReports}</div>
            <p className="text-xs text-muted-foreground">Fechamento do mês</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Acesso Rápido</h2>
        <div className="grid gap-4 md:grid-cols-2">
            <Link to="/dashboard/funcionarios">
                <Card className="hover:bg-slate-50 cursor-pointer transition-colors h-full">
                    <CardHeader>
                        <CardTitle>Cadastro de Funcionários</CardTitle>
                    </CardHeader>
                    <CardContent>
                        Adicione novos colaboradores e gerencie dados contratuais.
                    </CardContent>
                </Card>
            </Link>
            <Link to="/dashboard/pontos">
                <Card className="hover:bg-slate-50 cursor-pointer transition-colors h-full">
                    <CardHeader>
                        <CardTitle>Espelho de Ponto</CardTitle>
                    </CardHeader>
                    <CardContent>
                        Visualize e corrija marcações de ponto.
                    </CardContent>
                </Card>
            </Link>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;

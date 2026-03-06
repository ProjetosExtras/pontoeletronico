import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { startOfMonth, endOfMonth, eachDayOfInterval, format, getWeek } from "date-fns";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, LineChart, Line } from "recharts";
import { toast } from "sonner";

type EmployeeOption = {
  id: string;
  name: string;
};

type TimeEntryRow = {
  id: string;
  employee_id: string;
  timestamp: string;
  type: "entrada" | "intervalo" | "retorno" | "saida" | string;
};

type DaySeriesPoint = {
  day: string;
  horas: number;
  pausa: number;
};

type WeeklyPoint = {
  semana: string;
  media: number;
};

const WorkJourneyCharts = () => {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return format(now, "yyyy-MM");
  });
  const [loading, setLoading] = useState(false);
  const [series, setSeries] = useState<DaySeriesPoint[]>([]);
  const [weeklySeries, setWeeklySeries] = useState<WeeklyPoint[]>([]);

  const chartConfig = useMemo(
    () => ({
      horas: {
        label: "Horas Trabalhadas",
        color: "hsl(var(--chart-1))",
      },
      pausa: {
        label: "Intervalo",
        color: "hsl(var(--chart-2))",
      },
      media: {
        label: "Média Semanal",
        color: "hsl(var(--chart-3))",
      },
    }),
    []
  );

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("id", user?.id)
          .single();

        if (!profile?.company_id) return;

        const { data, error } = await supabase
          .from("employees")
          .select("id, name")
          .eq("company_id", profile.company_id)
          .order("name");

        if (error) throw error;
        const opts = (data || []) as EmployeeOption[];
        setEmployees(opts);
        if (!selectedEmployee && opts.length > 0) {
          setSelectedEmployee(opts[0].id);
        }
      } catch (err) {
        console.error(err);
        toast.error("Não foi possível carregar funcionários");
      }
    };
    fetchEmployees();
  }, [selectedEmployee]);

  useEffect(() => {
    const fetchSeries = async () => {
      if (!selectedEmployee || !selectedMonth) return;
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("id", user?.id)
          .single();

        if (!profile?.company_id) return;

        const [year, month] = selectedMonth.split("-").map(Number);
        const startDate = startOfMonth(new Date(year, month - 1));
        const endDate = endOfMonth(new Date(year, month - 1));

        const { data, error } = await supabase
          .from("time_entries")
          .select("id, employee_id, timestamp, type")
          .eq("company_id", profile.company_id)
          .eq("employee_id", selectedEmployee)
          .gte("timestamp", startDate.toISOString())
          .lte("timestamp", endDate.toISOString())
          .order("timestamp", { ascending: true });

        if (error) throw error;
        const entries = (data || []) as TimeEntryRow[];

        const days = eachDayOfInterval({ start: startDate, end: endDate });
        const points: DaySeriesPoint[] = days.map((d) => {
          const dateStr = format(d, "yyyy-MM-dd");
          const dayEntries = entries.filter((e) => format(new Date(e.timestamp), "yyyy-MM-dd") === dateStr);

          const entrada = dayEntries.find((e) => e.type === "entrada");
          const intervalo = dayEntries.find((e) => e.type === "intervalo");
          const retorno = dayEntries.find((e) => e.type === "retorno");
          const saida = dayEntries.find((e) => e.type === "saida");

          let horas = 0;
          let pausa = 0;
          if (entrada && saida) {
            const startMs = new Date(entrada.timestamp).getTime();
            const endMs = new Date(saida.timestamp).getTime();
            const totalMs = Math.max(0, endMs - startMs);

            let breakMs = 0;
            if (intervalo && retorno) {
              const iMs = new Date(intervalo.timestamp).getTime();
              const rMs = new Date(retorno.timestamp).getTime();
              breakMs = Math.max(0, rMs - iMs);
            }
            horas = (totalMs - breakMs) / (1000 * 60 * 60);
            pausa = breakMs / (1000 * 60 * 60);
          }

          return {
            day: format(d, "dd"),
            horas: Number(horas.toFixed(2)),
            pausa: Number(pausa.toFixed(2)),
          };
        });

        setSeries(points);

        const weekMap = new Map<number, { total: number; count: number }>();
        points.forEach((p, idx) => {
          const dateOfDay = days[idx];
          const weekNum = getWeek(dateOfDay, { weekStartsOn: 1 });
          const curr = weekMap.get(weekNum) || { total: 0, count: 0 };
          weekMap.set(weekNum, { total: curr.total + p.horas, count: curr.count + 1 });
        });
        const weekly: WeeklyPoint[] = Array.from(weekMap.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([w, agg]) => ({
            semana: `Sem ${w}`,
            media: Number((agg.total / Math.max(agg.count, 1)).toFixed(2)),
          }));
        setWeeklySeries(weekly);
      } catch (err) {
        console.error(err);
        toast.error("Não foi possível carregar a série de jornadas");
      } finally {
        setLoading(false);
      }
    };
    fetchSeries();
  }, [selectedEmployee, selectedMonth]);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Gráficos de Jornada</h2>
        <p className="text-muted-foreground">Acompanhe as horas trabalhadas por dia do colaborador.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">Funcionário</label>
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger>
              <SelectValue placeholder={employees.length ? "Selecione um funcionário" : "Carregando..."} />
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

        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">Mês de Referência</label>
          <Input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Horas por Dia</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="w-full">
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis tickFormatter={(v) => `${v}h`} />
                <ChartTooltip content={<ChartTooltipContent nameKey="horas" />} />
                <Bar dataKey="horas" fill="var(--color-horas)" />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Horas vs Intervalo (Empilhado)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="w-full">
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis tickFormatter={(v) => `${v}h`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="horas" stackId="a" fill="var(--color-horas)" />
                <Bar dataKey="pausa" stackId="a" fill="var(--color-pausa)" />
                <ChartLegend content={<ChartLegendContent />} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Tendência Semanal (Média de Horas)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="w-full">
              <LineChart data={weeklySeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="semana" />
                <YAxis tickFormatter={(v) => `${v}h`} />
                <ChartTooltip content={<ChartTooltipContent nameKey="media" />} />
                <Line dataKey="media" type="monotone" stroke="var(--color-media)" strokeWidth={2} dot />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default WorkJourneyCharts;

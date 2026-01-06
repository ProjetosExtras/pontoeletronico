import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Logo from "@/components/Logo";
import { Clock, LogIn, LogOut, Coffee, ArrowLeft, CheckCircle, User } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

type PunchType = "entrada" | "intervalo" | "retorno" | "saida";

interface PunchRecord {
  type: PunchType;
  time: string;
  date: string;
}

const ClockIn = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [employeeId, setEmployeeId] = useState("");
  const [isIdentified, setIsIdentified] = useState(false);
  const [employeeName, setEmployeeName] = useState("");
  const [todayPunches, setTodayPunches] = useState<PunchRecord[]>([]);
  const [lastPunch, setLastPunch] = useState<PunchRecord | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const handleIdentify = (e: React.FormEvent) => {
    e.preventDefault();
    if (employeeId.trim()) {
      // Simulating employee lookup
      setEmployeeName("João da Silva");
      setIsIdentified(true);
      // Simulate existing punches for today
      setTodayPunches([
        { type: "entrada", time: "08:02", date: "06/01/2025" },
      ]);
    }
  };

  const handlePunch = (type: PunchType) => {
    const punch: PunchRecord = {
      type,
      time: formatTime(currentTime).slice(0, 5),
      date: currentTime.toLocaleDateString("pt-BR"),
    };
    
    setTodayPunches([...todayPunches, punch]);
    setLastPunch(punch);
    
    const typeLabels: Record<PunchType, string> = {
      entrada: "Entrada",
      intervalo: "Saída para Intervalo",
      retorno: "Retorno do Intervalo",
      saida: "Saída",
    };
    
    toast.success(`${typeLabels[type]} registrada às ${punch.time}`, {
      description: "Registro salvo com sucesso!",
    });

    // Reset after 3 seconds
    setTimeout(() => {
      setIsIdentified(false);
      setEmployeeId("");
      setEmployeeName("");
      setTodayPunches([]);
      setLastPunch(null);
    }, 3000);
  };

  const punchButtons: { type: PunchType; icon: React.ElementType; label: string; color: string }[] = [
    { type: "entrada", icon: LogIn, label: "Entrada", color: "bg-success hover:bg-success/90" },
    { type: "intervalo", icon: Coffee, label: "Intervalo", color: "bg-warning hover:bg-warning/90 text-warning-foreground" },
    { type: "retorno", icon: Coffee, label: "Retorno", color: "bg-info hover:bg-info/90" },
    { type: "saida", icon: LogOut, label: "Saída", color: "bg-destructive hover:bg-destructive/90" },
  ];

  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      {/* Header */}
      <header className="p-4 md:p-6 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
          <span className="hidden sm:inline">Voltar</span>
        </Link>
        <Logo size="md" />
        <div className="w-20" />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Clock Display */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="text-6xl md:text-8xl font-bold text-foreground clock-display mb-2">
              {formatTime(currentTime)}
            </div>
            <p className="text-lg text-muted-foreground capitalize">
              {formatDate(currentTime)}
            </p>
          </div>

          {/* Card */}
          <div className="glass-card p-6 md:p-8 animate-fade-in-up">
            {!isIdentified ? (
              /* Identification Form */
              <form onSubmit={handleIdentify} className="space-y-6">
                <div className="text-center mb-6">
                  <div className="h-16 w-16 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground">Identificação</h2>
                  <p className="text-muted-foreground">Digite sua matrícula para registrar o ponto</p>
                </div>

                <Input
                  type="text"
                  placeholder="Matrícula ou código"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="text-center text-lg h-14 font-mono"
                  autoFocus
                />

                <Button type="submit" variant="clock" className="w-full" disabled={!employeeId.trim()}>
                  <Clock className="h-5 w-5" />
                  Identificar
                </Button>
              </form>
            ) : lastPunch ? (
              /* Success State */
              <div className="text-center py-8 animate-scale-in">
                <div className="h-20 w-20 bg-success rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-10 w-10 text-success-foreground" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Ponto Registrado!</h2>
                <p className="text-lg text-muted-foreground">
                  {lastPunch.type === "entrada" && "Entrada"}
                  {lastPunch.type === "intervalo" && "Saída para Intervalo"}
                  {lastPunch.type === "retorno" && "Retorno do Intervalo"}
                  {lastPunch.type === "saida" && "Saída"}
                  {" às "}
                  <span className="font-semibold text-foreground">{lastPunch.time}</span>
                </p>
                <p className="text-muted-foreground mt-2">{employeeName}</p>
              </div>
            ) : (
              /* Punch Options */
              <div className="space-y-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Funcionário identificado</p>
                  <h2 className="text-xl font-semibold text-foreground">{employeeName}</h2>
                </div>

                {/* Today's punches */}
                {todayPunches.length > 0 && (
                  <div className="bg-secondary/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-2">Registros de hoje:</p>
                    <div className="flex flex-wrap gap-2">
                      {todayPunches.map((punch, index) => (
                        <span key={index} className="px-3 py-1 bg-card rounded-full text-sm font-medium">
                          {punch.type === "entrada" && "Entrada"}
                          {punch.type === "intervalo" && "Intervalo"}
                          {punch.type === "retorno" && "Retorno"}
                          {punch.type === "saida" && "Saída"}
                          : {punch.time}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Punch buttons */}
                <div className="grid grid-cols-2 gap-3">
                  {punchButtons.map((btn) => (
                    <Button
                      key={btn.type}
                      onClick={() => handlePunch(btn.type)}
                      className={`h-20 flex flex-col gap-1 ${btn.color} text-primary-foreground`}
                    >
                      <btn.icon className="h-6 w-6" />
                      <span className="text-sm font-semibold">{btn.label}</span>
                    </Button>
                  ))}
                </div>

                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setIsIdentified(false);
                    setEmployeeId("");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            )}
          </div>

          {/* Footer info */}
          <div className="text-center mt-6 text-sm text-muted-foreground">
            <p>Sistema em conformidade com a Portaria 671/2021</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ClockIn;

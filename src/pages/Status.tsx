import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle, AlertTriangle, XCircle, RefreshCw } from "lucide-react";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";

const Status = () => {
  const services = [
    { name: "Web Application", status: "operational", uptime: "99.99%" },
    { name: "API Gateway", status: "operational", uptime: "99.95%" },
    { name: "Database (PostgreSQL)", status: "operational", uptime: "99.99%" },
    { name: "Authentication Service", status: "operational", uptime: "100%" },
    { name: "Notifications (Email/SMS)", status: "degraded", uptime: "98.50%" },
    { name: "Backup Systems", status: "operational", uptime: "100%" },
  ];

  const incidents = [
    {
      date: "06 de Janeiro, 2025",
      title: "Lentidão no envio de e-mails",
      status: "resolved",
      description: "Identificamos uma latência maior que o normal no nosso provedor de e-mails. O problema foi mitigado e a fila de mensagens está sendo processada.",
    },
    {
      date: "01 de Janeiro, 2025",
      title: "Manutenção Programada",
      status: "completed",
      description: "Atualização de segurança e melhorias de performance no banco de dados. O sistema ficou indisponível por 15 minutos durante a madrugada.",
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "operational":
        return <CheckCircle className="h-5 w-5 text-success" />;
      case "degraded":
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      case "outage":
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <CheckCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "operational":
        return "Operacional";
      case "degraded":
        return "Degradação Parcial";
      case "outage":
        return "Indisponível";
      case "resolved":
        return "Resolvido";
      case "completed":
        return "Concluído";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "operational":
        return "bg-success/10 text-success border-success/20";
      case "degraded":
        return "bg-warning/10 text-warning border-warning/20";
      case "outage":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-secondary text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="hidden sm:inline">Voltar ao início</span>
          </Link>
          
          <div className="flex items-center gap-2">
             <Logo size="sm" showText={true} />
             <div className="h-4 w-px bg-border mx-2 hidden sm:block"></div>
             <span className="text-sm font-medium hidden sm:block">Status</span>
          </div>

          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-success/10 rounded-full border border-success/20 mb-6">
            <CheckCircle className="h-5 w-5 text-success" />
            <span className="font-medium text-success">Todos os sistemas operacionais</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">Status do Sistema</h1>
          <p className="text-muted-foreground text-lg">
            Acompanhe em tempo real a disponibilidade e performance dos nossos serviços.
          </p>
        </div>

        {/* Current Status Grid */}
        <div className="grid gap-4 mb-16">
          {services.map((service) => (
            <div key={service.name} className="flex items-center justify-between p-4 bg-card border border-border rounded-lg shadow-sm">
              <div className="flex items-center gap-3">
                {getStatusIcon(service.status)}
                <span className="font-medium">{service.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground hidden sm:block">Uptime: {service.uptime}</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${getStatusColor(service.status)}`}>
                  {getStatusText(service.status)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Incident History */}
        <div className="space-y-8">
          <h2 className="text-2xl font-bold">Histórico de Incidentes</h2>
          
          <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
            {incidents.map((incident, index) => (
              <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                {/* Icon */}
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-border bg-background shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  {incident.status === 'resolved' || incident.status === 'completed' ? (
                    <CheckCircle className="h-5 w-5 text-success" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-warning" />
                  )}
                </div>
                
                {/* Content */}
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-border bg-card shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-foreground">{incident.title}</span>
                    <time className="font-mono text-xs text-muted-foreground">{incident.date}</time>
                  </div>
                  <p className="text-muted-foreground text-sm mb-3">
                    {incident.description}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium border ${getStatusColor(incident.status)}`}>
                    {getStatusText(incident.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer Simple */}
      <footer className="border-t border-border py-8 bg-muted/30">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 MW Tecnologia. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Status;

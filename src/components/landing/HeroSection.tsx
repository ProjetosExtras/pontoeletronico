import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight, Shield, Clock, Users } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center pt-20 gradient-hero overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -right-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">100% Conforme Portaria 671/2021</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              Controle de Ponto
              <span className="block text-gradient">Simples e Legal</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-lg leading-relaxed">
              Plataforma REP-P completa para sua empresa. Registro de ponto, cálculos automáticos e relatórios prontos para fiscalização.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/registro">
                <Button variant="hero" size="xl" className="w-full sm:w-auto group">
                  Começar Grátis
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/ponto">
                <Button variant="outline" size="xl" className="w-full sm:w-auto">
                  Ver Demonstração
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap gap-6 pt-4">
              {[
                "Sem cartão de crédito",
                "Setup em 5 minutos",
                "Suporte brasileiro"
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Content - Dashboard Preview */}
          <div className="relative lg:pl-8">
            <div className="glass-card p-6 md:p-8 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              {/* Mini Dashboard Preview */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Painel do Dia</h3>
                  <span className="text-sm text-muted-foreground">Segunda-feira</span>
                </div>

                {/* Time Display */}
                <div className="text-center py-6">
                  <div className="text-5xl md:text-6xl font-bold text-foreground clock-display">
                    08:47:32
                  </div>
                  <p className="text-muted-foreground mt-2">06 de Janeiro, 2025</p>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { icon: Clock, label: "Entrada", value: "08:00" },
                    { icon: Users, label: "Presentes", value: "47" },
                    { icon: Shield, label: "Status", value: "OK" },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center p-3 bg-secondary/50 rounded-lg">
                      <stat.icon className="h-5 w-5 mx-auto text-primary mb-1" />
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      <p className="font-semibold text-foreground">{stat.value}</p>
                    </div>
                  ))}
                </div>

                {/* Action Button Preview */}
                <Button variant="clock" className="w-full">
                  Registrar Ponto
                </Button>
              </div>
            </div>

            {/* Floating badges */}
            <div className="absolute -top-4 -right-4 glass-card px-4 py-2 animate-fade-in" style={{ animationDelay: "0.4s" }}>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-success rounded-full animate-pulse" />
                <span className="text-sm font-medium">Sistema Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

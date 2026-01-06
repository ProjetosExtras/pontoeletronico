import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { 
  Fingerprint, 
  Tablet, 
  Calculator, 
  FileText, 
  Shield, 
  Clock,
  Users,
  BarChart3,
  Smartphone,
  MapPin,
  Lock,
  Cloud
} from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: Fingerprint,
      title: "Múltiplas Formas de Registro",
      description: "Biometria, cartão, matrícula ou tablet. Integração com REPs físicos via IP.",
    },
    {
      icon: Calculator,
      title: "Cálculos Automáticos",
      description: "Horas extras, adicional noturno, banco de horas e intervalos calculados automaticamente.",
    },
    {
      icon: FileText,
      title: "Relatórios Completos",
      description: "Espelho de ponto, relatórios mensais e exportação em PDF, CSV e Excel.",
    },
    {
      icon: Shield,
      title: "100% Legal (REP-P)",
      description: "Conforme Portaria 671/2021. Registros imutáveis, auditoria completa e rastreabilidade.",
    },
    {
      icon: Tablet,
      title: "Tablet na Recepção",
      description: "Interface fullscreen para registro rápido com feedback visual e sonoro.",
    },
    {
      icon: Users,
      title: "Multiempresas",
      description: "Gerencie múltiplas empresas e filiais em uma única plataforma SaaS.",
    },
    {
      icon: Clock,
      title: "Escalas e Jornadas",
      description: "Configure jornadas flexíveis, escalas 12x36, turnos e feriados personalizados.",
    },
    {
      icon: BarChart3,
      title: "Dashboard em Tempo Real",
      description: "Acompanhe presenças, atrasos e inconsistências no momento que acontecem.",
    },
    {
      icon: Smartphone,
      title: "Aplicativo Móvel",
      description: "App nativo para iOS e Android com registro offline e sincronização automática.",
    },
    {
      icon: MapPin,
      title: "Geolocalização",
      description: "Cerca virtual para limitar onde o ponto pode ser registrado.",
    },
    {
      icon: Lock,
      title: "Segurança Avançada",
      description: "Criptografia de ponta a ponta e backups diários automáticos.",
    },
    {
      icon: Cloud,
      title: "100% na Nuvem",
      description: "Acesse de qualquer lugar, sem necessidade de servidores locais.",
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Recursos Completos para sua Gestão
            </h1>
            <p className="text-xl text-muted-foreground">
              Conheça em detalhes todas as funcionalidades que tornam o MW Tecnologia a melhor escolha para seu controle de ponto.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="glass-card p-8 hover:shadow-lg transition-all duration-300 group border border-border"
              >
                <div className="h-14 w-14 gradient-primary rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-primary/20">
                  <feature.icon className="h-7 w-7 text-primary-foreground" />
                </div>
                <h3 className="font-bold text-xl mb-3 text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-24 bg-primary/5 rounded-3xl p-8 md:p-12 text-center max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Pronto para transformar sua gestão?</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Junte-se a centenas de empresas que já modernizaram seu controle de ponto com o MW Tecnologia.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/registro" className="inline-flex items-center justify-center h-12 px-8 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
                Começar Grátis
              </a>
              <a href="/ponto" className="inline-flex items-center justify-center h-12 px-8 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground font-medium transition-colors">
                Ver Demonstração
              </a>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Features;

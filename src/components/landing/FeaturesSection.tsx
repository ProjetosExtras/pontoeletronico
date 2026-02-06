import { 
  Fingerprint, 
  Tablet, 
  Calculator, 
  FileText, 
  Shield, 
  Clock,
  Users,
  BarChart3
} from "lucide-react";

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
];

const FeaturesSection = () => {
  return (
    <section id="recursos" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Tudo que sua empresa precisa
          </h2>
          <p className="text-lg text-muted-foreground">
            Plataforma completa de controle de ponto eletrônico com todos os recursos para gestão eficiente.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="glass-card p-6 hover:shadow-lg transition-all duration-300 group animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="h-12 w-12 gradient-primary rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <feature.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2 text-foreground">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;

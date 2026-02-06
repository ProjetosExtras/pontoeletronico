import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Check, Shield, Zap, Building2 } from "lucide-react";
import { Link } from "react-router-dom";

const Plans = () => {
  const plans = [
    {
      name: "Starter",
      description: "Ideal para pequenas empresas e startups.",
      price: "Grátis",
      period: "/mês",
      icon: <Zap className="h-6 w-6 text-primary" />,
      features: [
        "Até 5 funcionários",
        "Registro de ponto web",
        "Relatórios básicos",
        "Suporte por e-mail",
        "Armazenamento seguro",
      ],
      buttonText: "Começar Grátis",
      buttonVariant: "outline" as const,
      popular: false,
    },
    {
      name: "Business",
      description: "Para empresas em crescimento.",
      price: "R$ 49,90",
      period: "/mês",
      icon: <Shield className="h-6 w-6 text-primary" />,
      features: [
        "Até 20 funcionários",
        "Todos recursos do Starter",
        "Aplicativo móvel",
        "Geolocalização",
        "Exportação fiscal (AFDT/ACJEF)",
        "Suporte prioritário",
      ],
      buttonText: "Assinar Agora",
      buttonVariant: "hero" as const,
      popular: true,
    },
    {
      name: "Enterprise",
      description: "Controle total para grandes operações.",
      price: "Sob Consulta",
      period: "",
      icon: <Building2 className="h-6 w-6 text-primary" />,
      features: [
        "Funcionários ilimitados",
        "Múltiplos CNPJs",
        "Reconhecimento facial",
        "API de integração",
        "Gestor de conta dedicado",
        "SLA garantido",
      ],
      buttonText: "Falar com Consultor",
      buttonVariant: "outline" as const,
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Escolha o plano ideal para sua empresa
            </h1>
            <p className="text-xl text-muted-foreground">
              Preços transparentes, sem custos ocultos. Teste qualquer plano pago gratuitamente por 14 dias.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => (
              <div 
                key={plan.name} 
                className={`relative flex flex-col p-8 rounded-2xl border ${
                  plan.popular 
                    ? "border-primary shadow-lg bg-card/50 backdrop-blur-sm ring-1 ring-primary/20" 
                    : "border-border bg-card/30"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-sm font-medium rounded-full">
                    Mais Popular
                  </div>
                )}

                <div className="mb-8">
                  <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                    {plan.icon}
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-muted-foreground">{plan.description}</p>
                </div>

                <div className="mb-8">
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground ml-2">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-4 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary shrink-0" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link to="/registro">
                  <Button 
                    variant={plan.buttonVariant} 
                    className="w-full"
                    size="lg"
                  >
                    {plan.buttonText}
                  </Button>
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-20 text-center">
            <h3 className="text-xl font-semibold mb-4">Dúvidas Frequentes</h3>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto text-left mt-8">
              <div className="bg-muted/30 p-6 rounded-lg">
                <h4 className="font-semibold mb-2">Posso mudar de plano depois?</h4>
                <p className="text-muted-foreground text-sm">Sim, você pode fazer upgrade ou downgrade a qualquer momento através do painel administrativo.</p>
              </div>
              <div className="bg-muted/30 p-6 rounded-lg">
                <h4 className="font-semibold mb-2">Preciso de cartão de crédito para testar?</h4>
                <p className="text-muted-foreground text-sm">Não, você pode começar com o plano Grátis ou testar o Business por 14 dias sem compromisso.</p>
              </div>
              <div className="bg-muted/30 p-6 rounded-lg">
                <h4 className="font-semibold mb-2">O sistema é homologado?</h4>
                <p className="text-muted-foreground text-sm">Sim, o MW Tecnologia é 100% aderente à Portaria 671 do MTE como REP-P.</p>
              </div>
              <div className="bg-muted/30 p-6 rounded-lg">
                <h4 className="font-semibold mb-2">Existe fidelidade?</h4>
                <p className="text-muted-foreground text-sm">Não, nossos planos são mensais e você pode cancelar quando quiser sem multa.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Plans;

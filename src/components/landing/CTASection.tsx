import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle } from "lucide-react";

const CTASection = () => {
  return (
    <section className="py-24 gradient-primary relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary-foreground/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-primary-foreground/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-6">
            Comece a controlar o ponto da sua empresa hoje
          </h2>
          <p className="text-lg md:text-xl text-primary-foreground/80 mb-8">
            Configure em 5 minutos. Sem cartão de crédito. Teste grátis por 14 dias.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <Link to="/registro">
              <Button 
                size="xl" 
                className="w-full sm:w-auto bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-bold group"
              >
                Criar Conta Grátis
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/ponto">
              <Button 
                size="xl" 
                variant="outline"
                className="w-full sm:w-auto border-2 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:border-primary-foreground/50"
              >
                Ver Demonstração
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap justify-center gap-6">
            {[
              "Sem taxa de adesão",
              "Suporte incluso",
              "Atualizações grátis",
              "Cancele quando quiser"
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-primary-foreground/80">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;

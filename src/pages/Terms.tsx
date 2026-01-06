import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { ScrollText, ShieldCheck, AlertCircle, HelpCircle } from "lucide-react";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-12 text-center">
            <h1 className="text-4xl font-bold mb-4">Termos de Uso</h1>
            <p className="text-muted-foreground text-lg">
              Regras e condições para utilização dos serviços da MW Tecnologia.
            </p>
          </div>

          <div className="space-y-12">
            {/* Aceitação */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <ScrollText className="h-8 w-8 text-primary" />
                <h2 className="text-2xl font-bold">1. Aceitação dos Termos</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Ao acessar e utilizar a plataforma MW Tecnologia, você concorda expressamente com estes Termos de Uso. Caso não concorde com qualquer disposição destes termos, recomendamos que não utilize nossos serviços.
              </p>
            </section>

            {/* Serviços */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <ShieldCheck className="h-8 w-8 text-primary" />
                <h2 className="text-2xl font-bold">2. Descrição dos Serviços</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-4">
                A MW Tecnologia fornece uma plataforma de controle de ponto eletrônico (REP-P) em conformidade com a Portaria 671/2021 do MTE. O serviço inclui:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Registro de ponto via web, mobile e tablet;</li>
                <li>Gestão de jornada de trabalho e escalas;</li>
                <li>Relatórios gerenciais e fiscais;</li>
                <li>Armazenamento seguro de dados em nuvem.</li>
              </ul>
            </section>

            {/* Responsabilidades */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="h-8 w-8 text-primary" />
                <h2 className="text-2xl font-bold">3. Responsabilidades do Usuário</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                O usuário se compromete a:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Fornecer informações verdadeiras e atualizadas;</li>
                <li>Manter o sigilo de suas credenciais de acesso;</li>
                <li>Não utilizar a plataforma para fins ilegais ou não autorizados;</li>
                <li>Respeitar os direitos de propriedade intelectual da MW Tecnologia.</li>
              </ul>
            </section>

            {/* Limitações */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <HelpCircle className="h-8 w-8 text-primary" />
                <h2 className="text-2xl font-bold">4. Limitação de Responsabilidade</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                A MW Tecnologia envida seus melhores esforços para garantir a disponibilidade contínua do serviço, mas não se responsabiliza por:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Falhas de conexão de internet do usuário;</li>
                <li>Uso indevido da plataforma por parte do usuário;</li>
                <li>Danos indiretos ou lucros cessantes decorrentes do uso do serviço.</li>
              </ul>
            </section>

            {/* Alterações */}
            <section className="bg-muted/30 p-8 rounded-xl border border-border">
              <h2 className="text-2xl font-bold mb-4">5. Alterações nos Termos</h2>
              <p className="text-muted-foreground">
                A MW Tecnologia reserva-se o direito de alterar estes Termos de Uso a qualquer momento. As alterações entrarão em vigor imediatamente após sua publicação na plataforma. O uso continuado do serviço após as alterações implica na aceitação dos novos termos.
              </p>
            </section>

            <div className="text-center pt-8 border-t border-border">
              <p className="text-muted-foreground">
                Última atualização: Janeiro de 2025.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Terms;

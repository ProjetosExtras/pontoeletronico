import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { Shield, Lock, FileText, UserCheck } from "lucide-react";

const LGPD = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-12 text-center">
            <h1 className="text-4xl font-bold mb-4">Política de Privacidade e LGPD</h1>
            <p className="text-muted-foreground text-lg">
              Compromisso da MW Tecnologia com a proteção dos seus dados pessoais.
            </p>
          </div>

          <div className="space-y-12">
            {/* Introdução */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="h-8 w-8 text-primary" />
                <h2 className="text-2xl font-bold">Introdução</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                A MW Tecnologia está comprometida em garantir a privacidade e a proteção dos dados pessoais de todos os usuários do nosso sistema de controle de ponto eletrônico, em total conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD).
              </p>
            </section>

            {/* Coleta de Dados */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <FileText className="h-8 w-8 text-primary" />
                <h2 className="text-2xl font-bold">Dados Coletados</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Para o funcionamento adequado do sistema de registro de ponto (REP-P), coletamos os seguintes dados pessoais:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Nome completo e CPF;</li>
                <li>Dados biométricos (quando aplicável para reconhecimento facial ou digital);</li>
                <li>Geolocalização no momento do registro do ponto;</li>
                <li>Horários de entrada, saída e intervalos;</li>
                <li>Informações do dispositivo utilizado para o registro.</li>
              </ul>
            </section>

            {/* Finalidade */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <UserCheck className="h-8 w-8 text-primary" />
                <h2 className="text-2xl font-bold">Finalidade do Tratamento</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Os dados coletados são utilizados exclusivamente para:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Registro e controle da jornada de trabalho, em cumprimento à legislação trabalhista (CLT e Portaria 671/2021);</li>
                <li>Garantia da segurança jurídica e autenticidade dos registros;</li>
                <li>Prevenção de fraudes e segurança do sistema;</li>
                <li>Geração de arquivos fiscais e relatórios gerenciais para o empregador.</li>
              </ul>
            </section>

            {/* Segurança */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <Lock className="h-8 w-8 text-primary" />
                <h2 className="text-2xl font-bold">Segurança da Informação</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Adotamos medidas técnicas e administrativas rigorosas para proteger seus dados, incluindo:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Criptografia de ponta a ponta em todas as transmissões de dados;</li>
                <li>Armazenamento seguro em servidores com certificações de segurança internacionais;</li>
                <li>Controle de acesso rigoroso e monitoramento de atividades;</li>
                <li>Backups regulares e planos de recuperação de desastres.</li>
              </ul>
            </section>

            {/* Seus Direitos */}
            <section className="bg-muted/30 p-8 rounded-xl border border-border">
              <h2 className="text-2xl font-bold mb-4">Seus Direitos como Titular</h2>
              <p className="text-muted-foreground mb-4">
                Você tem o direito de solicitar a qualquer momento:
              </p>
              <div className="grid sm:grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  Confirmação da existência de tratamento de dados.
                </div>
                <div className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  Acesso aos dados coletados.
                </div>
                <div className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  Correção de dados incompletos ou desatualizados.
                </div>
                <div className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  Informações sobre compartilhamento de dados.
                </div>
              </div>
            </section>

            <div className="text-center pt-8 border-t border-border">
              <p className="text-muted-foreground">
                Para exercer seus direitos ou tirar dúvidas sobre nossa política de privacidade, entre em contato através do e-mail: <br />
                <a href="mailto:privacidade@mwtecnologia.com.br" className="text-primary hover:underline font-medium">privacidade@mwtecnologia.com.br</a>
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default LGPD;

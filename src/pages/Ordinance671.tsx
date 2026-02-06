import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { Scale, CheckCircle, FileText, AlertTriangle } from "lucide-react";

const Ordinance671 = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-12 text-center">
            <h1 className="text-4xl font-bold mb-4">Portaria MTP Nº 671/2021</h1>
            <p className="text-muted-foreground text-lg">
              Entenda como o MW Tecnologia atende a todas as exigências legais do controle de ponto.
            </p>
          </div>

          <div className="space-y-12">
            {/* O que é */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <Scale className="h-8 w-8 text-primary" />
                <h2 className="text-2xl font-bold">O que é a Portaria 671?</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                A Portaria 671, publicada em novembro de 2021 pelo Ministério do Trabalho e Previdência, consolidou e modernizou as regras sobre o registro de ponto eletrônico no Brasil. Ela substituiu as antigas portarias 1510 e 373, estabelecendo novas diretrizes para o Registrador Eletrônico de Ponto (REP).
              </p>
            </section>

            {/* Tipos de REP */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <FileText className="h-8 w-8 text-primary" />
                <h2 className="text-2xl font-bold">Classificações do REP</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-4">
                A portaria define três categorias de registradores:
              </p>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-card border border-border p-6 rounded-xl">
                  <h3 className="font-bold mb-2 text-primary">REP-C</h3>
                  <p className="text-sm text-muted-foreground">Registro de Ponto Convencional. É o relógio de ponto tradicional físico.</p>
                </div>
                <div className="bg-card border border-border p-6 rounded-xl">
                  <h3 className="font-bold mb-2 text-primary">REP-A</h3>
                  <p className="text-sm text-muted-foreground">Registro de Ponto Alternativo. Software autorizado por convenção coletiva.</p>
                </div>
                <div className="bg-primary/5 border border-primary/20 p-6 rounded-xl">
                  <h3 className="font-bold mb-2 text-primary">REP-P</h3>
                  <p className="text-sm text-muted-foreground">Registrador Eletrônico de Ponto via Programa. É a categoria do <strong>MW Tecnologia</strong>.</p>
                </div>
              </div>
            </section>

            {/* Conformidade MW Tecnologia */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="h-8 w-8 text-primary" />
                <h2 className="text-2xl font-bold">Como o MW Tecnologia atende a lei</h2>
              </div>
              <ul className="space-y-4">
                <li className="flex gap-3 items-start">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5 shrink-0" />
                  <div>
                    <strong className="block text-foreground">Registro do Ponto (Art. 74 a 80)</strong>
                    <span className="text-muted-foreground">Nosso sistema registra fielmente as marcações, sem permitir alterações automáticas ou restrições de horário.</span>
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5 shrink-0" />
                  <div>
                    <strong className="block text-foreground">Comprovante de Registro (Art. 81)</strong>
                    <span className="text-muted-foreground">Emitimos o Comprovante de Registro de Ponto do Trabalhador (comprovante em PDF/Digital) a cada marcação.</span>
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5 shrink-0" />
                  <div>
                    <strong className="block text-foreground">Arquivos Fiscais (Anexo I)</strong>
                    <span className="text-muted-foreground">Geração dos arquivos AFDT (Arquivo Fonte de Dados Tratados) e ACJEF (Arquivo de Controle de Jornada para Efeitos Fiscais) no padrão exigido.</span>
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5 shrink-0" />
                  <div>
                    <strong className="block text-foreground">Assinatura Eletrônica (Art. 88)</strong>
                    <span className="text-muted-foreground">Utilizamos assinaturas digitais qualificadas para garantir a integridade e autoria dos arquivos fiscais.</span>
                  </div>
                </li>
              </ul>
            </section>

            {/* Importância */}
            <section className="bg-yellow-500/10 border border-yellow-500/20 p-6 rounded-xl">
              <div className="flex items-center gap-3 mb-4 text-yellow-600 dark:text-yellow-400">
                <AlertTriangle className="h-6 w-6" />
                <h3 className="font-bold text-lg">Por que a conformidade é importante?</h3>
              </div>
              <p className="text-muted-foreground">
                Utilizar um sistema não conforme pode acarretar em multas pesadas para a empresa e insegurança jurídica em processos trabalhistas. Com o MW Tecnologia, sua empresa está 100% blindada e em dia com as obrigações legais.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Ordinance671;

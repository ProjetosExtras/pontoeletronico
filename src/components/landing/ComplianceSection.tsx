import { Shield, Lock, FileCheck, History, Download, Eye } from "lucide-react";

const complianceItems = [
  {
    icon: Lock,
    title: "Registros Imutáveis",
    description: "Marcações não podem ser alteradas ou excluídas, apenas justificadas com histórico.",
  },
  {
    icon: History,
    title: "Auditoria Completa",
    description: "Log de todas as alterações com data, hora, usuário responsável e justificativa.",
  },
  {
    icon: FileCheck,
    title: "Espelho de Ponto",
    description: "Documento oficial com todas as marcações conforme exigido pela legislação.",
  },
  {
    icon: Download,
    title: "Exportação Fiscal",
    description: "Dados em formato compatível com fiscalização do Ministério do Trabalho.",
  },
  {
    icon: Eye,
    title: "Rastreabilidade",
    description: "Identificação completa do empregado, fuso horário e origem do registro.",
  },
  {
    icon: Shield,
    title: "Integridade Garantida",
    description: "Sistema à prova de fraudes com validações e controles de segurança.",
  },
];

const ComplianceSection = () => {
  return (
    <section id="conformidade" className="py-24 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Portaria MTP/MTE 671/2021</span>
            </div>

            <h2 className="text-3xl md:text-4xl font-bold">
              REP-P: Registrador Eletrônico de Ponto via Programa
            </h2>

            <p className="text-lg text-muted-foreground leading-relaxed">
              O MW Tecnologia é uma solução REP-P homologada, desenvolvida em total conformidade com a legislação brasileira. 
              Sua empresa fica protegida em fiscalizações e auditorias trabalhistas.
            </p>

            <div className="pt-4">
              <div className="inline-block px-6 py-3 bg-card border border-border rounded-lg">
                <p className="text-sm text-muted-foreground">CNPJ MW Tecnologia</p>
                <p className="font-mono font-semibold text-foreground">39.433.448/0001-34</p>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {complianceItems.map((item, index) => (
              <div
                key={item.title}
                className="glass-card p-5 animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <item.icon className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-1 text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ComplianceSection;

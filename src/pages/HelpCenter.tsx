import { Link } from "react-router-dom";
import { ArrowLeft, Search, FileText, MessageCircle, HelpCircle, ChevronRight, BookOpen } from "lucide-react";
import Logo from "@/components/Logo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const HelpCenter = () => {
  const categories = [
    {
      title: "Primeiros Passos",
      icon: BookOpen,
      articles: ["Como criar uma conta", "Configurando sua empresa", "Cadastrando funcionários", "Instalando o aplicativo"]
    },
    {
      title: "Registro de Ponto",
      icon: FileText,
      articles: ["Como bater ponto pelo celular", "Esqueci de registrar o ponto", "Geolocalização não funciona", "Ponto offline"]
    },
    {
      title: "Gestão e Relatórios",
      icon: FileText,
      articles: ["Como emitir espelho de ponto", "Aprovando solicitações de ajuste", "Banco de horas", "Exportação para folha"]
    },
    {
      title: "Faturamento e Planos",
      icon: HelpCircle,
      articles: ["Alterar forma de pagamento", "Upgrade de plano", "Notas fiscais", "Cancelamento"]
    }
  ];

  const faqs = [
    {
      question: "O sistema funciona sem internet?",
      answer: "Sim! O aplicativo permite o registro de ponto offline. As marcações são armazenadas no dispositivo e sincronizadas automaticamente quando houver conexão com a internet."
    },
    {
      question: "Posso usar em múltiplos dispositivos?",
      answer: "Sim, o sistema é multi-plataforma e pode ser acessado via web, tablets e smartphones (Android e iOS)."
    },
    {
      question: "É compatível com a Portaria 671?",
      answer: "Totalmente. O MW Tecnologia é um sistema REP-P homologado e atende a todas as exigências legais da Portaria MTP/MTE 671/2021."
    },
    {
      question: "Como funciona o reconhecimento facial?",
      answer: "O reconhecimento facial é opcional e utiliza a câmera do dispositivo para validar a identidade do colaborador no momento do registro, garantindo maior segurança contra fraudes."
    }
  ];

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
             <span className="text-sm font-medium hidden sm:block">Central de Ajuda</span>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Link to="/registro">
              <Button size="sm">Criar Conta</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Search Section */}
      <section className="bg-primary/5 py-16 md:py-24">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h1 className="text-3xl md:text-5xl font-bold mb-6">Como podemos ajudar?</h1>
          <p className="text-lg text-muted-foreground mb-8">Encontre respostas, tutoriais e dicas para aproveitar ao máximo o MW Tecnologia.</p>
          
          <div className="relative max-w-xl mx-auto shadow-lg rounded-lg">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="Busque por dúvidas, tópicos ou palavras-chave..." 
              className="pl-12 h-12 text-base bg-background border-primary/20 focus:border-primary"
            />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-12 max-w-6xl">
        
        {/* Categories Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {categories.map((category, index) => (
            <div key={index} className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center mb-4 text-primary">
                <category.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-lg mb-4">{category.title}</h3>
              <ul className="space-y-2">
                {category.articles.map((article, idx) => (
                  <li key={idx}>
                    <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 group">
                      <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity -ml-4" />
                      {article}
                    </a>
                  </li>
                ))}
              </ul>
              <a href="#" className="inline-flex items-center gap-1 text-sm font-medium text-primary mt-4 hover:underline">
                Ver todos <ChevronRight className="h-3 w-3" />
              </a>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-2xl font-bold mb-6 text-center">Perguntas Frequentes</h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Contact CTA */}
        <div className="bg-secondary/30 rounded-2xl p-8 md:p-12 text-center">
          <MessageCircle className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Ainda precisa de ajuda?</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Nossa equipe de suporte está disponível de segunda a sexta, das 08h às 18h para te ajudar.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="gap-2">
              Falar com Suporte
            </Button>
            <Button variant="outline" size="lg" className="gap-2">
              Enviar E-mail
            </Button>
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

export default HelpCenter;

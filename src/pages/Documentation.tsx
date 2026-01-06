import { Link } from "react-router-dom";
import { ArrowLeft, Book, FileText, Search } from "lucide-react";
import Logo from "@/components/Logo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const Documentation = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <Logo size="sm" />
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link to="/documentacao" className="text-primary">Visão Geral</Link>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Guia Rápido</a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">API</a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Buscar na documentação..." 
                className="pl-9 h-9 bg-secondary/50 border-transparent focus:bg-background"
              />
            </div>
            <Link to="/login">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        <div className="grid md:grid-cols-[240px_1fr] gap-8">
          {/* Sidebar */}
          <aside className="hidden md:block space-y-8 sticky top-24 h-fit">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-foreground">Começando</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="block hover:text-primary transition-colors text-primary font-medium">Introdução</a></li>
                <li><a href="#" className="block hover:text-primary transition-colors">Instalação</a></li>
                <li><a href="#" className="block hover:text-primary transition-colors">Configuração Inicial</a></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-foreground">Funcionalidades</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="block hover:text-primary transition-colors">Registro de Ponto</a></li>
                <li><a href="#" className="block hover:text-primary transition-colors">Gestão de Funcionários</a></li>
                <li><a href="#" className="block hover:text-primary transition-colors">Relatórios</a></li>
                <li><a href="#" className="block hover:text-primary transition-colors">Integrações</a></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-foreground">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/portaria671" className="block hover:text-primary transition-colors">Portaria 671</Link></li>
                <li><Link to="/termos" className="block hover:text-primary transition-colors">Termos de Uso</Link></li>
                <li><Link to="/lgpd" className="block hover:text-primary transition-colors">Privacidade</Link></li>
              </ul>
            </div>
          </aside>

          {/* Content */}
          <div className="space-y-8 max-w-3xl">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full text-primary text-xs font-medium">
                <Book className="h-3 w-3" />
                Documentação Oficial
              </div>
              <h1 className="text-4xl font-bold text-foreground">Bem-vindo à Documentação MW Tecnologia</h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Aprenda como configurar e utilizar o sistema de ponto eletrônico mais completo e seguro do mercado.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-6 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors group cursor-pointer">
                <FileText className="h-8 w-8 text-primary mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold text-lg mb-2">Guia Rápido</h3>
                <p className="text-muted-foreground text-sm">Passo a passo para configurar sua empresa e começar a registrar pontos em menos de 5 minutos.</p>
              </div>

              <div className="p-6 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors group cursor-pointer">
                <Search className="h-8 w-8 text-primary mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold text-lg mb-2">Central de Ajuda</h3>
                <p className="text-muted-foreground text-sm">Respostas para as dúvidas mais frequentes sobre operação, legislação e suporte técnico.</p>
              </div>
            </div>

            <div className="prose prose-neutral dark:prose-invert max-w-none">
              <h2>Sobre o Sistema</h2>
              <p>
                O MW Tecnologia é uma plataforma SaaS de controle de ponto eletrônico (REP-P) desenvolvida em total conformidade com a Portaria MTP/MTE 671/2021. 
                Nossa solução oferece segurança jurídica, praticidade operacional e gestão eficiente da jornada de trabalho.
              </p>
              
              <h3>Principais Recursos</h3>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Registro de ponto via web, mobile ou tablet</li>
                <li>Geolocalização e reconhecimento facial (opcional)</li>
                <li>Cálculo automático de horas extras e banco de horas</li>
                <li>Emissão de espelho de ponto e arquivos fiscais (AFDT/ACJEF)</li>
                <li>Assinatura eletrônica do espelho de ponto</li>
              </ul>
            </div>
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

export default Documentation;

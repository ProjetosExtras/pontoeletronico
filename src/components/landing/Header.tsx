import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { Menu } from "lucide-react";
import { useState } from "react";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link to="/">
            <Logo size="md" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/recursos" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
              Recursos
            </Link>
            <Link to="/#conformidade" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
              Conformidade
            </Link>
            <Link to="/planos" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
              Planos
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/ponto">
              <Button variant="outline" className="border-primary/20 hover:bg-primary/5 hover:text-primary">
                Bater Ponto
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="ghost">Área do Gestor</Button>
            </Link>
            <Link to="/registro">
              <Button variant="hero">Começar Grátis</Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="h-6 w-6 text-foreground" />
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border/50 animate-fade-in">
            <nav className="flex flex-col gap-4">
              <Link to="/recursos" className="text-muted-foreground hover:text-foreground transition-colors font-medium py-2">
                Recursos
              </Link>
              <Link to="/#conformidade" className="text-muted-foreground hover:text-foreground transition-colors font-medium py-2">
                Conformidade
              </Link>
              <Link to="/planos" className="text-muted-foreground hover:text-foreground transition-colors font-medium py-2">
                Planos
              </Link>
              <div className="flex flex-col gap-2 pt-4 border-t border-border/50">
                <Link to="/ponto">
                  <Button variant="outline" className="w-full border-primary/20">Bater Ponto</Button>
                </Link>
                <Link to="/login">
                  <Button variant="ghost" className="w-full">Área do Gestor</Button>
                </Link>
                <Link to="/registro">
                  <Button variant="hero" className="w-full">Começar Grátis</Button>
                </Link>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;

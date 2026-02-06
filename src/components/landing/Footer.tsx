import { Link } from "react-router-dom";
import Logo from "@/components/Logo";

const Footer = () => {
  return (
    <footer className="bg-foreground text-background py-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          <div className="md:col-span-2">
            <div className="mb-4">
              <Logo size="md" />
            </div>
            <p className="text-background/70 max-w-md mb-4">
              Plataforma de controle de ponto eletrônico (REP-P) em conformidade com a Portaria MTP/MTE 671/2021.
            </p>
            <div className="text-sm text-background/50">
              <p>CNPJ: 39.433.448/0001-34</p>
              <p>MW Tecnologia</p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-background">Produto</h4>
            <ul className="space-y-2 text-background/70">
              <li><Link to="/recursos" className="hover:text-background transition-colors">Recursos</Link></li>
              <li><Link to="/#conformidade" className="hover:text-background transition-colors">Conformidade</Link></li>
              <li><Link to="/planos" className="hover:text-background transition-colors">Planos</Link></li>
              <li><Link to="/ponto" className="hover:text-background transition-colors">Demonstração</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-background">Suporte</h4>
            <ul className="space-y-2 text-background/70">
              <li><Link to="/ajuda" className="hover:text-background transition-colors">Central de Ajuda</Link></li>
              <li><Link to="/documentacao" className="hover:text-background transition-colors">Documentação</Link></li>
              <li><a href="#" className="hover:text-background transition-colors">Contato</a></li>
              <li><Link to="/status" className="hover:text-background transition-colors">Status do Sistema</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-background/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-background/50">
            © 2025 MW Tecnologia. Todos os direitos reservados.
          </p>
          <div className="flex gap-6 text-sm text-background/50">
            <Link to="/termos" className="hover:text-background transition-colors">Termos de Uso</Link>
            <a href="#" className="hover:text-background transition-colors">Privacidade</a>
            <Link to="/lgpd" className="hover:text-background transition-colors">LGPD</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

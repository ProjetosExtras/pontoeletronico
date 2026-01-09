import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Logo from "@/components/Logo";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const ForgotPassword = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/atualizar-senha`,
      });

      if (error) {
        throw error;
      }

      setIsSubmitted(true);
      toast.success("E-mail de recuperação enviado!");
    } catch (error: any) {
      console.error("Reset password error:", error);
      let msg = error.message || "Erro ao enviar e-mail de recuperação.";
      if (msg === "Failed to fetch" || (error.name === "TypeError" && msg.includes("fetch"))) {
        msg = "Erro de conexão. Verifique sua internet.";
      }
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      {/* Header */}
      <header className="p-4 md:p-6">
        <Link to="/login" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors w-fit">
          <ArrowLeft className="h-5 w-5" />
          <span>Voltar ao login</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="glass-card p-8 animate-fade-in-up">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <Logo size="lg" showText={false} />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Recuperar Senha</h1>
              <p className="text-muted-foreground mt-1">
                {isSubmitted 
                  ? "Verifique seu e-mail para continuar" 
                  : "Digite seu e-mail para receber o link de redefinição"}
              </p>
            </div>

            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail cadastrado</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" variant="hero" className="w-full" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Enviar link de recuperação"}
                </Button>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center">
                  <p className="text-sm text-foreground">
                    Enviamos um link de recuperação para <strong>{email}</strong>.
                    Clique no link para definir uma nova senha.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => setIsSubmitted(false)}
                >
                  Tentar outro e-mail
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ForgotPassword;

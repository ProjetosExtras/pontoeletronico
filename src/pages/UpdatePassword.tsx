import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Logo from "@/components/Logo";
import { Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const UpdatePassword = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    // Check if user is authenticated (via the recovery link)
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Link inválido ou expirado.");
        navigate("/login");
      }
    };
    checkSession();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setIsSuccess(true);
      toast.success("Senha atualizada com sucesso!");
      
      // Redirect after a few seconds
      setTimeout(() => {
        navigate("/login");
      }, 3000);

    } catch (error: any) {
      console.error("Update password error:", error);
      let msg = error.message || "Erro ao atualizar senha.";
      if (msg === "Failed to fetch" || (error.name === "TypeError" && msg.includes("fetch"))) {
        msg = "Erro de conexão. Verifique sua internet.";
      }
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
        <div className="w-full max-w-md glass-card p-8 animate-fade-in-up text-center">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2">Senha Atualizada!</h1>
          <p className="text-muted-foreground mb-6">
            Sua senha foi alterada com sucesso. Você será redirecionado para o login em instantes.
          </p>
          <Button onClick={() => navigate("/login")} className="w-full">
            Ir para Login agora
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      {/* Header */}
      <header className="p-4 md:p-6">
        <div className="flex items-center gap-2">
           <Logo size="sm" showText={true} />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="glass-card p-8 animate-fade-in-up">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-foreground">Definir Nova Senha</h1>
              <p className="text-muted-foreground mt-1">
                Digite sua nova senha abaixo
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" variant="hero" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Salvar Nova Senha"}
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UpdatePassword;

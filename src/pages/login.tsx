import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getInstanceStatus } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { KeyRound, ArrowRight, Plus, Wifi } from "lucide-react";

export function LoginPage() {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setToken: saveToken } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token.trim()) return;

    setLoading(true);
    try {
      await getInstanceStatus(token.trim());
      saveToken(token.trim());
      navigate("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao conectar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-mesh noise-overlay flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo & branding */}
        <div className="animate-fade-up stagger-1 text-center">
          <div className="mb-2 flex items-center justify-center gap-2">
            <Wifi className="h-5 w-5 text-cyan-accent" />
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              QR Connect
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Conecte sua instância WhatsApp via Evolution API
          </p>
        </div>

        {/* Card */}
        <div className="animate-fade-up stagger-2 glass-card glow-cyan rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Token da Instância
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Cole seu token aqui"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="input-glow h-12 rounded-xl border-border/50 bg-background/40 pl-10 font-mono text-sm transition-all placeholder:text-muted-foreground/50"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="h-12 w-full rounded-xl bg-primary font-semibold tracking-wide transition-all hover:brightness-110"
              disabled={loading || !token.trim()}
            >
              {loading ? (
                <span className="animate-pulse-soft">Autenticando...</span>
              ) : (
                <span className="flex items-center gap-2">
                  Entrar
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          <div className="mt-6 border-t border-border/30 pt-6">
            <Button
              type="button"
              variant="ghost"
              className="w-full gap-2 text-muted-foreground transition-colors hover:text-primary"
              onClick={() => navigate("/onboarding")}
            >
              <Plus className="h-4 w-4" />
              Criar nova instância
            </Button>
          </div>
        </div>

        {/* Footer */}
        <p className="animate-fade-up stagger-3 text-center text-xs text-muted-foreground/50">
          Vytal Medical &middot; Evolution API v2
        </p>
      </div>
    </div>
  );
}

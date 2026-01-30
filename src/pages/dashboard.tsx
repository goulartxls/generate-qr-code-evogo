import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { disconnectInstance } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { useInstanceStatus } from "@/hooks/use-instance-status";
import { StatusBadge } from "@/components/status-badge";
import {
  Eye,
  EyeOff,
  Copy,
  Unplug,
  LogOut,
  RefreshCw,
  Shield,
} from "lucide-react";

export function DashboardPage() {
  const { token, clearToken } = useAuth();
  const navigate = useNavigate();
  const { status } = useInstanceStatus(token, 5000);
  const [showToken, setShowToken] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    if (!token) navigate("/");
  }, [token, navigate]);

  if (!token) return null;

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await disconnectInstance(token!);
      toast.success("Instância desconectada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao desconectar");
    } finally {
      setDisconnecting(false);
    }
  }

  function handleLogout() {
    clearToken();
    navigate("/");
  }

  function copyToken() {
    navigator.clipboard.writeText(token!);
    toast.success("Token copiado!");
  }

  const maskedToken = token.replace(/./g, "•");

  return (
    <div className="bg-mesh noise-overlay flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Main card */}
        <div className="animate-fade-up stagger-1 glass-card glow-cyan rounded-2xl p-8">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <h1 className="text-lg font-semibold text-foreground">
                Dashboard
              </h1>
            </div>
            <StatusBadge status={status} />
          </div>

          {/* Token section */}
          <div className="space-y-5">
            <div className="rounded-xl border border-border/30 bg-background/20 p-4">
              <p className="mb-2.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Token da Instância
              </p>
              <div className="flex items-center gap-2">
                <Input
                  value={showToken ? token : maskedToken}
                  readOnly
                  className="h-9 border-none bg-transparent font-mono text-xs text-foreground/80"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowToken((v) => !v)}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  {showToken ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={copyToken}
                  className="shrink-0 text-muted-foreground hover:text-primary"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-border/20" />

            {/* Actions */}
            <div className="space-y-3">
              {status === "connected" ? (
                <Button
                  variant="destructive"
                  className="h-11 w-full gap-2 rounded-xl font-medium transition-all"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                >
                  {disconnecting ? (
                    <span className="animate-pulse-soft">
                      Desconectando...
                    </span>
                  ) : (
                    <>
                      <Unplug className="h-4 w-4" />
                      Desconectar
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  className="h-11 w-full gap-2 rounded-xl bg-primary font-medium tracking-wide transition-all hover:brightness-110"
                  onClick={() => navigate("/onboarding")}
                >
                  <RefreshCw className="h-4 w-4" />
                  Reconectar
                </Button>
              )}

              <Button
                variant="ghost"
                className="h-11 w-full gap-2 rounded-xl font-medium text-muted-foreground transition-all hover:text-foreground"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
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

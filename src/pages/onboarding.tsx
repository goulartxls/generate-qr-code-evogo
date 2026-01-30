import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createInstance, pairInstance, getInstanceQR } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { useInstanceStatus } from "@/hooks/use-instance-status";
import { QrCodeView } from "@/components/qr-code-view";
import { PairingCode } from "@/components/pairing-code";
import { StatusBadge } from "@/components/status-badge";
import {
  Server,
  Phone,
  QrCode,
  ArrowRight,
  Copy,
  RefreshCw,
  Check,
  RotateCcw,
  KeyRound,
} from "lucide-react";

const STEP_META = [
  { icon: Server, label: "Instância" },
  { icon: Phone, label: "Telefone" },
  { icon: QrCode, label: "Conexão" },
];

const STORAGE_KEY = "onboarding_state";

interface OnboardingState {
  step: number;
  instanceName: string;
  token: string;
  phone: string;
  qrBase64: string;
  pairingCode: string;
}

function saveState(state: OnboardingState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState(): OnboardingState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OnboardingState;
  } catch {
    return null;
  }
}

function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}

/** Deep-search for a pairing code in any shape of response object */
function extractPairingCode(obj: unknown): string {
  if (!obj || typeof obj !== "object") return "";
  const record = obj as Record<string, unknown>;
  // Check common field names at any level
  for (const key of ["PairingCode", "pairingCode", "pairing_code", "code", "Code"]) {
    if (typeof record[key] === "string" && record[key]) return record[key] as string;
  }
  // Check nested "data" object
  if (record.data && typeof record.data === "object") {
    return extractPairingCode(record.data);
  }
  return "";
}

/** Build alternate phone number (toggle the 9 digit after DDD). Expects DDD+number without country code. */
function alternatePhone(phone: string): string {
  const ddd = phone.slice(0, 2);
  const rest = phone.slice(2);
  return rest.startsWith("9") && rest.length === 9
    ? `${ddd}${rest.slice(1)}`
    : `${ddd}9${rest}`;
}

const PAIR_MAX_RETRIES = 10;
const PAIR_RETRY_DELAY_MS = 3000;

/** Try pair with given phone, retrying until a non-empty PairingCode is returned. */
async function tryPair(token: string, fullPhone: string) {
  const phones = [fullPhone, alternatePhone(fullPhone)];

  for (let attempt = 0; attempt < PAIR_MAX_RETRIES; attempt++) {
    for (const number of phones) {
      try {
        const result = await pairInstance(token, number);
        console.log(`[tryPair] attempt ${attempt + 1} with ${number}:`, JSON.stringify(result));
        const code = extractPairingCode(result);
        if (code) return result;
      } catch (err) {
        console.warn(`[tryPair] attempt ${attempt + 1} failed with ${number}:`, err);
      }
    }

    if (attempt < PAIR_MAX_RETRIES - 1) {
      console.log(`[tryPair] empty code, retrying in ${PAIR_RETRY_DELAY_MS}ms...`);
      await new Promise((r) => setTimeout(r, PAIR_RETRY_DELAY_MS));
    }
  }

  console.warn("[tryPair] all retries exhausted, returning last attempt");
  return pairInstance(token, fullPhone);
}

export function OnboardingPage() {
  const location = useLocation();
  const routeState = location.state as { token?: string; phone?: string } | null;
  const saved = useRef(loadState());

  // If navigated from dashboard: token+phone → step 3, token only → step 2
  const initialStep = routeState?.token
    ? (routeState?.phone ? 3 : 2)
    : (saved.current?.step ?? 1);
  const initialToken = routeState?.token ?? saved.current?.token ?? "";
  const initialPhone = routeState?.phone ?? saved.current?.phone ?? "";

  const [step, setStep] = useState(initialStep);
  const [instanceName, setInstanceName] = useState(
    saved.current?.instanceName ?? ""
  );
  const [token, setToken] = useState(initialToken);
  const [phone, setPhone] = useState(initialPhone);
  const [qrBase64, setQrBase64] = useState(saved.current?.qrBase64 ?? "");
  const [pairingCode, setPairingCode] = useState(
    saved.current?.pairingCode ?? ""
  );
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setToken: saveToken } = useAuth();
  const { status } = useInstanceStatus(step === 3 ? token : null, 1000);
  const navigatedRef = useRef(false);
  const phoneRef = useRef(initialPhone);

  const sanitizedName = instanceName.replace(/\s+/g, "-");
  const fullPhone = phone.replace(/\D/g, "");

  // Persist state on every change
  useEffect(() => {
    saveState({ step, instanceName, token, phone, qrBase64, pairingCode });
  }, [step, instanceName, token, phone, qrBase64, pairingCode]);

  useEffect(() => {
    if (step === 3 && status === "connected" && !navigatedRef.current) {
      navigatedRef.current = true;
      toast.success("WhatsApp conectado com sucesso!");
      setTimeout(() => navigate("/dashboard"), 2000);
    }
  }, [step, status, navigate]);

  // On mount: if restored to step 3, fetch fresh QR + pairing code
  useEffect(() => {
    if (initialStep !== 3 || !initialToken || !initialPhone) return;
    const phone = initialPhone;
    (async () => {
      try {
        console.log("[restore] fetching fresh QR and pair code...");
        const qrResult = await getInstanceQR(token);
        setQrBase64(qrResult.data.Qrcode);
        await new Promise((r) => setTimeout(r, 1500));
        const pairResult = await tryPair(token, phone);
        const code = extractPairingCode(pairResult);
        setPairingCode(code);
        console.log("[restore] done, code:", code);
      } catch (err) {
        console.warn("[restore] failed:", err);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh QR + pairing code every 30s while on step 3 and not connected
  useEffect(() => {
    if (step !== 3 || status === "connected" || !phoneRef.current) return;
    const interval = setInterval(async () => {
      try {
        console.log("[auto-refresh] refreshing QR and pair code...");
        const qrResult = await getInstanceQR(token);
        setQrBase64(qrResult.data.Qrcode);
        await new Promise((r) => setTimeout(r, 1500));
        const pairResult = await tryPair(token, phoneRef.current);
        const code = extractPairingCode(pairResult);
        setPairingCode(code);
        console.log("[auto-refresh] done, code:", code);
      } catch (err) {
        console.warn("[auto-refresh] failed:", err);
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [step, status, token]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!sanitizedName) return;
    setLoading(true);
    try {
      const result = await createInstance(sanitizedName);
      setToken(result.token);
      saveToken(result.token);
      setStep(2);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao criar instância"
      );
    } finally {
      setLoading(false);
    }
  }

  const fetchPairAndQR = useCallback(
    async (phoneNumber: string) => {
      // QR first (initiates WebSocket session), then pair code
      const qrResult = await getInstanceQR(token);
      console.log("[fetchPairAndQR] QR received");
      setQrBase64(qrResult.data.Qrcode);

      // Small delay to let the session initialize before requesting pair
      await new Promise((r) => setTimeout(r, 1500));

      const pairResult = await tryPair(token, phoneNumber);
      const code = extractPairingCode(pairResult);
      console.log("[fetchPairAndQR] PairingCode:", code, "raw:", JSON.stringify(pairResult));
      setPairingCode(code);

      return code;
    },
    [token]
  );

  async function handlePair(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    phoneRef.current = fullPhone;
    localStorage.setItem("instance-phone", fullPhone);
    setLoading(true);
    try {
      await fetchPairAndQR(fullPhone);
      setStep(3);
    } catch (err) {
      console.error("[handlePair] error:", err);
      toast.error(err instanceof Error ? err.message : "Erro ao conectar");
    } finally {
      setLoading(false);
    }
  }

  async function handleRefreshQR() {
    try {
      await fetchPairAndQR(phoneRef.current);
      toast.success("QR Code atualizado");
    } catch (err) {
      console.error("[handleRefreshQR] error:", err);
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar");
    }
  }

  function copyToken() {
    navigator.clipboard.writeText(token);
    toast.success("Token copiado!");
  }

  return (
    <div className="bg-mesh noise-overlay flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Step indicators */}
        <div className="animate-fade-up stagger-1 flex items-center justify-center gap-3">
          {STEP_META.map((meta, i) => {
            const stepNum = i + 1;
            const Icon = meta.icon;
            const isActive = stepNum === step;
            const isDone = stepNum < step;

            return (
              <div key={stepNum} className="flex items-center gap-3">
                {i > 0 && (
                  <div
                    className={`h-px w-8 transition-colors duration-500 ${
                      isDone ? "bg-primary" : "bg-border/40"
                    }`}
                  />
                )}
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-500 ${
                      isActive
                        ? "step-active border-primary bg-primary/15 text-primary"
                        : isDone
                          ? "border-primary/50 bg-primary/10 text-primary/70"
                          : "border-border/40 bg-background/20 text-muted-foreground/40"
                    }`}
                  >
                    {isDone ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-medium uppercase tracking-wider ${
                      isActive
                        ? "text-primary"
                        : isDone
                          ? "text-primary/60"
                          : "text-muted-foreground/40"
                    }`}
                  >
                    {meta.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Step 1: Instance Name */}
        {step === 1 && (
          <div className="animate-fade-up glass-card glow-cyan rounded-2xl p-8">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-foreground">
                Nome da Instância
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Escolha um nome para identificar esta conexão
              </p>
            </div>
            <form onSubmit={handleCreate} className="space-y-5">
              <div className="space-y-2">
                <div className="relative">
                  <Server className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="minha-instancia"
                    value={instanceName}
                    onChange={(e) => setInstanceName(e.target.value)}
                    className="input-glow h-12 rounded-xl border-border/50 bg-background/40 pl-10 font-mono text-sm transition-all placeholder:text-muted-foreground/50"
                  />
                </div>
                {instanceName && instanceName !== sanitizedName && (
                  <p className="text-xs text-muted-foreground">
                    Será salvo como:{" "}
                    <span className="font-mono text-primary">
                      {sanitizedName}
                    </span>
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="h-12 w-full rounded-xl bg-primary font-semibold tracking-wide transition-all hover:brightness-110"
                disabled={loading || !sanitizedName}
              >
                {loading ? (
                  <span className="animate-pulse-soft">Criando...</span>
                ) : (
                  <span className="flex items-center gap-2">
                    Criar Instância
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
                onClick={() => navigate("/")}
              >
                <KeyRound className="h-4 w-4" />
                Já tenho um token
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Phone Number */}
        {step === 2 && (
          <div className="animate-fade-up glass-card glow-cyan rounded-2xl p-8">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-foreground">
                Número de Telefone
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Informe o DDD + número (sem o código do país)
              </p>
            </div>
            <div className="space-y-5">
              {/* Token display */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-primary/70">
                  Seu token — salve-o
                </p>
                <div className="flex gap-2">
                  <Input
                    value={token}
                    readOnly
                    className="h-9 border-none bg-transparent font-mono text-xs text-foreground/80"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={copyToken}
                    className="shrink-0 gap-1.5 text-primary hover:text-primary"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copiar
                  </Button>
                </div>
              </div>

              <form onSubmit={handlePair} className="space-y-5">
                <div>
                  <div className="flex items-stretch">
                    <div className="flex items-center rounded-l-xl border border-r-0 border-border/50 bg-background/60 px-3">
                      <span className="font-mono text-sm text-muted-foreground">
                        +55
                      </span>
                    </div>
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="41999999999"
                        value={phone}
                        onChange={(e) =>
                          setPhone(e.target.value.replace(/\D/g, ""))
                        }
                        maxLength={11}
                        className="input-glow h-12 rounded-l-none rounded-r-xl border-border/50 bg-background/40 pl-10 font-mono text-sm transition-all placeholder:text-muted-foreground/50"
                      />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground/60">
                    Ex: 41999999999 (DDD + número)
                  </p>
                </div>
                <Button
                  type="submit"
                  className="h-12 w-full rounded-xl bg-primary font-semibold tracking-wide transition-all hover:brightness-110"
                  disabled={loading || phone.replace(/\D/g, "").length < 10}
                >
                  {loading ? (
                    <span className="animate-pulse-soft">Conectando...</span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Conectar
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </form>
            </div>
          </div>
        )}

        {/* Step 3: QR Code */}
        {step === 3 && (
          <div className="animate-fade-up glass-card glow-cyan rounded-2xl p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Escaneie o QR Code
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Use o WhatsApp no celular
                </p>
              </div>
              <StatusBadge status={status} />
            </div>

            <div className="space-y-5">
              <QrCodeView base64={qrBase64} />
              <PairingCode code={pairingCode} />

              <div className="rounded-xl border border-border/30 bg-background/20 p-4">
                <ol className="list-inside list-decimal space-y-1.5 text-sm leading-relaxed text-muted-foreground">
                  <li>Abra o WhatsApp no celular</li>
                  <li>
                    Toque em{" "}
                    <span className="text-foreground/80">Mais opções</span> ou{" "}
                    <span className="text-foreground/80">Configurações</span>
                  </li>
                  <li>
                    Toque em{" "}
                    <span className="text-foreground/80">
                      Aparelhos conectados
                    </span>
                  </li>
                  <li>Escaneie o QR Code ou digite o código</li>
                </ol>
              </div>

              <Button
                type="button"
                variant="outline"
                className="h-11 w-full gap-2 rounded-xl border-border/40 font-medium transition-all hover:border-primary/40 hover:text-primary"
                onClick={handleRefreshQR}
              >
                <RefreshCw className="h-4 w-4" />
                Atualizar QR Code
              </Button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="space-y-2 text-center">
          {step > 1 && (
            <button
              type="button"
              onClick={() => {
                clearState();
                setStep(1);
                setInstanceName("");
                setToken("");
                setPhone("");
                setQrBase64("");
                setPairingCode("");
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-border/40 bg-background/20 px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-primary/40 hover:text-primary"
            >
              <RotateCcw className="h-4 w-4" />
              Recomeçar do início
            </button>
          )}
          <p className="text-xs text-muted-foreground/50">
            Vytal Medical &middot; Evolution API v2
          </p>
        </div>
      </div>
    </div>
  );
}

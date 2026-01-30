import { Wifi, WifiOff, Loader2 } from "lucide-react";

const config: Record<
  string,
  { label: string; className: string; icon: typeof Wifi }
> = {
  connected: {
    label: "Conectado",
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    icon: Wifi,
  },
  disconnected: {
    label: "Desconectado",
    className:
      "border-red-500/30 bg-red-500/10 text-red-400",
    icon: WifiOff,
  },
};

interface StatusBadgeProps {
  status: string | null;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const resolved = config[status ?? ""] ?? {
    label: "Aguardando",
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-400",
    icon: Loader2,
  };

  const Icon = resolved.icon;
  const isLoading = !config[status ?? ""];

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${resolved.className}`}
    >
      <Icon
        className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`}
      />
      {resolved.label}
    </div>
  );
}

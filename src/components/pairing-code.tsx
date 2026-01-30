import { Copy } from "lucide-react";
import { toast } from "sonner";

interface PairingCodeProps {
  code: string;
}

export function PairingCode({ code }: PairingCodeProps) {
  if (!code) return null;

  function handleCopy() {
    navigator.clipboard.writeText(code);
    toast.success("Código copiado!");
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-primary/70">
        Código de pareamento
      </p>
      <button
        onClick={handleCopy}
        className="group inline-flex items-center gap-3 transition-colors"
      >
        <span className="font-mono text-2xl font-bold tracking-[0.25em] text-foreground">
          {code}
        </span>
        <Copy className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </button>
    </div>
  );
}

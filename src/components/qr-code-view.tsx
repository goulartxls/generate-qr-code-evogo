import { Skeleton } from "@/components/ui/skeleton";

interface QrCodeViewProps {
  base64: string;
}

export function QrCodeView({ base64 }: QrCodeViewProps) {
  if (!base64) {
    return (
      <div className="flex justify-center">
        <div className="qr-container">
          <Skeleton className="h-56 w-56 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <div className="qr-container">
        <img src={base64} alt="QR Code" className="h-56 w-56 rounded-lg" />
      </div>
    </div>
  );
}

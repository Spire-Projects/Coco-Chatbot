import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Modal bloqueante con loader y mensajes animados
export function ResolvingTemporaryNumbersModal({
  open,
  messages,
}: {
  open: boolean;
  messages: string[];
}) {
  const [messageIndex, setMessageIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (open) {
      setMessageIndex(0);
      intervalRef.current = setInterval(() => {
        setMessageIndex((prev) => (prev + 1) % messages.length);
      }, 2000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [open, messages.length]);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="flex flex-col items-center gap-4 select-none"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>Actualizando números de venta</DialogTitle>
        </DialogHeader>
        <Loader2 className="animate-spin text-blue-600 w-12 h-12 mx-auto" />
        <div className="text-lg font-medium text-center min-h-[2.5rem]">
          {messages[messageIndex]}
        </div>
        <div className="text-xs text-gray-400 text-center">
          Por favor espera, este proceso es automático y puede tardar unos
          segundos...
        </div>
      </DialogContent>
    </Dialog>
  );
}

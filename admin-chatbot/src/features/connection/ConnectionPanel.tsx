import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { ConnectionState } from "../sessions/types";

interface ConnectionPanelProps {
  state: ConnectionState;
}

const STATUS_LABELS: Record<ConnectionState["status"], string> = {
  starting: "Iniciando...",
  waiting_qr: "Esperando escaneo",
  connected: "Conectado",
  reconnecting: "Reconectando..."
};

export const ConnectionPanel = ({ state }: ConnectionPanelProps) => {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const buildQr = async () => {
      if (!state.qrRaw || state.status !== "waiting_qr") {
        setQrDataUrl(null);
        return;
      }

      try {
        const dataUrl = await QRCode.toDataURL(state.qrRaw, {
          margin: 2,
          width: 260,
          errorCorrectionLevel: "M",
          color: { dark: "#111827", light: "#f9fafb" }
        });
        if (!cancelled) setQrDataUrl(dataUrl);
      } catch {
        if (!cancelled) setQrDataUrl(null);
      }
    };

    void buildQr();
    return () => { cancelled = true; };
  }, [state.qrRaw, state.status]);

  const isConnected = state.status === "connected";
  const isWaitingQr = state.status === "waiting_qr";
  const isLoading = state.status === "starting" || state.status === "reconnecting";

  return (
    <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-40 h-40 blur-3xl rounded-full opacity-20 pointer-events-none transition-colors duration-700 ${
        isConnected ? "bg-emerald-500" : isWaitingQr ? "bg-indigo-500" : "bg-amber-500"
      }`} />

      <div className="flex items-center justify-between mb-5 relative z-10">
        <h2 className="text-lg font-display font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
          </svg>
          WhatsApp
        </h2>
        <span className={`px-3 py-1 text-xs font-bold rounded-full flex items-center gap-1.5 border ${
          isConnected
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
            : isWaitingQr
            ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
            : "bg-amber-500/10 text-amber-400 border-amber-500/30"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            isConnected ? "bg-emerald-500 animate-pulse" :
            isWaitingQr ? "bg-indigo-400" : "bg-amber-400 animate-pulse"
          }`} />
          {STATUS_LABELS[state.status]}
        </span>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-[200px]">
        {isConnected && (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-slate-300 text-sm font-medium">Bot activo y listo</p>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-10 h-10 rounded-full border-4 border-slate-700 border-t-amber-400 animate-spin" />
            <p className="text-slate-400 text-sm">{STATUS_LABELS[state.status]}</p>
          </div>
        )}

        {isWaitingQr && (
          <div className="flex flex-col items-center gap-4">
            {qrDataUrl ? (
              <>
                <div className="rounded-2xl overflow-hidden border-4 border-white/10 shadow-lg">
                  <img src={qrDataUrl} alt="QR de conexion WhatsApp" width={220} height={220} />
                </div>
                <p className="text-slate-400 text-xs text-center leading-relaxed max-w-[220px]">
                  Abre WhatsApp → <span className="text-white font-medium">Dispositivos vinculados</span> → Vincular dispositivo
                </p>
              </>
            ) : (
              <div className="w-10 h-10 rounded-full border-4 border-slate-700 border-t-indigo-400 animate-spin" />
            )}
          </div>
        )}
      </div>
    </section>
  );
};

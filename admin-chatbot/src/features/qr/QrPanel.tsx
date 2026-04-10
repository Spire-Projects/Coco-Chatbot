import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { SessionConnectionState } from "../sessions/types";

interface QrPanelProps {
  connection: SessionConnectionState;
  qrRaw: string | null;
}

export const QrPanel = ({ connection, qrRaw }: QrPanelProps) => {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const buildQr = async () => {
      if (!qrRaw || connection.status === "connected") {
        setQrDataUrl(null);
        return;
      }

      try {
        const dataUrl = await QRCode.toDataURL(qrRaw, {
          margin: 1,
          width: 240,
          errorCorrectionLevel: "M"
        });

        if (!cancelled) {
          setQrDataUrl(dataUrl);
        }
      } catch {
        if (!cancelled) {
          setQrDataUrl(null);
        }
      }
    };

    void buildQr();

    return () => {
      cancelled = true;
    };
  }, [connection.status, qrRaw]);

  const shouldShowQr = connection.status !== "connected" && qrRaw;

  return (
    <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none"></div>
      
      <div className="flex items-center justify-between mb-6 relative z-10">
        <h2 className="text-xl font-display font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
          QR de Conexion
        </h2>
      </div>

      <div className="relative z-10">
        {shouldShowQr ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-400 leading-relaxed">Escanea este codigo para vincular WhatsApp Web a la sesion seleccionada.</p>
            <div className="flex flex-col items-center justify-center p-6 bg-white/5 border border-white/10 rounded-2xl shadow-inner">
              <div className="bg-white p-3 rounded-xl shadow-lg ring-4 ring-white/5 flex items-center justify-center min-w-[240px] min-h-[240px]">
                {qrDataUrl ? (
                  <img src={qrDataUrl} width={240} height={240} alt="QR de sesion" className="max-w-full h-auto" />
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin"></div>
                    <p className="text-slate-500 text-sm font-medium">Generando QR...</p>
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-500 text-center font-medium mt-2">
              Actualizado: {new Date(connection.qrUpdatedAt ?? connection.lastStatusAt).toLocaleString()}
            </p>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-black/20 rounded-2xl border border-white/5 border-dashed">
            <svg className="w-12 h-12 text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 13l4 4L19 7" /></svg>
            <p className="text-sm text-slate-400 font-medium">No hay QR disponible. Si la sesion se desconecta, aparecera automaticamente.</p>
          </div>
        )}
      </div>
    </section>
  );
};

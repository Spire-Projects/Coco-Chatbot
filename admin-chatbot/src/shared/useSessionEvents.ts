import { useEffect } from "react";
import type { SessionConnectionState } from "../features/sessions/types";

interface UseSessionEventsInput {
  baseUrl: string;
  sessionId: string;
  onState: (state: SessionConnectionState) => void;
  onQr: (qrRaw: string) => void;
  onStreamError: (message: string) => void;
}

interface SessionQrEvent {
  sessionId: string;
  qrRaw: string;
  qrUpdatedAt: string | null;
}

export const useSessionEvents = ({
  baseUrl,
  sessionId,
  onState,
  onQr,
  onStreamError
}: UseSessionEventsInput) => {
  useEffect(() => {
    if (!sessionId) {
      return;
    }

    let cancelled = false;
    let source: EventSource | null = null;
    let retries = 0;

    const connect = () => {
      if (cancelled) {
        return;
      }

      source = new EventSource(
        `${baseUrl}/api/sessions/${sessionId}/events?stream=${Date.now()}`
      );

      source.addEventListener("session_state", (event) => {
        const parsed = JSON.parse((event as MessageEvent).data) as SessionConnectionState;
        onState(parsed);
      });

      source.addEventListener("session_qr", (event) => {
        const parsed = JSON.parse((event as MessageEvent).data) as SessionQrEvent;
        if (parsed.qrRaw) {
          onQr(parsed.qrRaw);
        }
      });

      source.addEventListener("heartbeat", () => {
        retries = 0;
      });

      source.onerror = () => {
        source?.close();
        retries += 1;
        const delay = Math.min(8000, 500 * 2 ** retries);
        onStreamError(`SSE desconectado. Reintentando en ${Math.round(delay / 1000)}s.`);
        setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      cancelled = true;
      source?.close();
    };
  }, [baseUrl, onQr, onState, onStreamError, sessionId]);
};

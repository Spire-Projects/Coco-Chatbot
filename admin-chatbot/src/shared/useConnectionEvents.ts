import { useEffect, useState } from "react";
import type { ConnectionState } from "../features/sessions/types";

export const useConnectionEvents = (baseUrl: string): ConnectionState => {
  const [state, setState] = useState<ConnectionState>({ status: "starting", qrRaw: null });

  useEffect(() => {
    let cancelled = false;
    let source: EventSource | null = null;
    let retries = 0;

    const connect = () => {
      if (cancelled) return;

      source = new EventSource(`${baseUrl}/api/status/events`);

      source.onmessage = (event) => {
        const parsed = JSON.parse((event as MessageEvent).data) as ConnectionState;
        setState(parsed);
        retries = 0;
      };

      source.onerror = () => {
        source?.close();
        retries += 1;
        const delay = Math.min(16000, 500 * 2 ** retries);
        setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      cancelled = true;
      source?.close();
    };
  }, [baseUrl]);

  return state;
};

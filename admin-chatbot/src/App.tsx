import { useCallback, useEffect, useMemo, useState } from "react";
import { PromptEditorPanel } from "./features/prompts/PromptEditorPanel";
import { QrPanel } from "./features/qr/QrPanel";
import { SessionSelector } from "./features/sessions/SessionSelector";
import { SessionStatusPanel } from "./features/sessions/SessionStatusPanel";
import type { SessionConnectionState, SessionItem } from "./features/sessions/types";
import { api } from "./shared/api";
import { useSessionEvents } from "./shared/useSessionEvents";
import "./App.css";

const findSessionOrFirst = (sessions: SessionItem[], selectedSessionId: string): SessionItem | null => {
  if (sessions.length === 0) {
    return null;
  }

  return sessions.find((session) => session.sessionId === selectedSessionId) ?? sessions[0];
};

function App() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [streamMessage, setStreamMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [qrRaw, setQrRaw] = useState<string | null>(null);

  const selectedSession = useMemo(
    () => findSessionOrFirst(sessions, selectedSessionId),
    [selectedSessionId, sessions]
  );

  const handleState = useCallback(
    (state: SessionConnectionState) => {
      setSessions((current) =>
        current.map((session) =>
          session.sessionId === state.sessionId
            ? {
                ...session,
                connection: state
              }
            : session
        )
      );

      if (state.sessionId === selectedSessionId) {
        setQrRaw(state.qrRaw);
        setStreamMessage("");
      }
    },
    [selectedSessionId]
  );

  const handleQr = useCallback((nextQrRaw: string) => {
    setQrRaw(nextQrRaw);
  }, []);

  const handleStreamError = useCallback((message: string) => {
    setStreamMessage(message);
  }, []);

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const payload = await api.getSessions();
        setSessions(payload.sessions);
        if (!selectedSessionId && payload.sessions.length > 0) {
          setSelectedSessionId(payload.sessions[0].sessionId);
          setQrRaw(payload.sessions[0].connection.qrRaw);
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "No se pudo cargar el estado de sesiones.");
      }
    };

    void loadSessions();
  }, [selectedSessionId]);

  useSessionEvents({
    baseUrl: api.baseUrl,
    sessionId: selectedSession?.sessionId ?? "",
    onState: handleState,
    onQr: handleQr,
    onStreamError: handleStreamError
  });

  useEffect(() => {
    if (!selectedSession) {
      return;
    }

    setQrRaw(selectedSession.connection.qrRaw);
  }, [selectedSession]);

  if (sessions.length === 0) {
    return (
      <main className="w-full max-w-5xl mx-auto px-4 py-8 md:py-12 animate-in fade-in duration-700">
        <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/50 text-center flex flex-col items-center justify-center min-h-[40vh]">
          <div className="w-16 h-16 rounded-full border-4 border-slate-800 border-t-emerald-500 animate-spin mb-6"></div>
          <h1 className="text-3xl font-display text-white mb-2">Admin Chatbot</h1>
          <p className="text-slate-400 font-medium tracking-wide">Cargando sesiones...</p>
          {errorMessage ? <p className="mt-4 text-rose-400 font-semibold bg-rose-500/10 px-4 py-2 rounded-lg border border-rose-500/20">{errorMessage}</p> : null}
        </section>
      </main>
    );
  }

  if (!selectedSession) {
    return (
      <main className="w-full max-w-5xl mx-auto px-4 py-8 md:py-12 animate-in fade-in duration-500">
        <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/50 text-center">
          <h1 className="text-3xl font-display text-white mb-2">Admin Chatbot</h1>
          <p className="text-rose-400 font-semibold bg-rose-500/10 px-4 py-2 rounded-lg border border-rose-500/20 inline-block mt-2">No hay sesion seleccionada.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="w-full max-w-6xl mx-auto px-4 py-8 md:py-12 grid gap-6 animate-in fade-in duration-500 slide-in-from-bottom-4">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 p-6 md:p-8 bg-black/20 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl shadow-black/40 relative overflow-hidden group">
        <div className="absolute inset-0 bg-linear-to-r from-emerald-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
        <div className="relative z-10">
          <p className="text-emerald-400 uppercase tracking-[0.15em] text-xs font-bold mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Apple Land Control Center
          </p>
          <h1 className="text-3xl md:text-5xl font-display font-medium tracking-tight text-white m-0">Estado de sesiones y prompts</h1>
        </div>
        <div className="relative z-10 w-full md:w-auto min-w-[280px]">
          <SessionSelector
            sessions={sessions}
            selectedSessionId={selectedSession.sessionId}
            onSelect={setSelectedSessionId}
          />
        </div>
      </header>

      {streamMessage ? (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-6 py-4 rounded-2xl flex items-center gap-3">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <p className="font-medium m-0">{streamMessage}</p>
        </div>
      ) : null}

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SessionStatusPanel session={selectedSession} />
        <QrPanel connection={selectedSession.connection} qrRaw={qrRaw} />
      </section>

      <PromptEditorPanel sessionId={selectedSession.sessionId} />
    </main>
  );
}

export default App;

import type { SessionItem } from "./types";

interface SessionStatusPanelProps {
  session: SessionItem;
}

const getBinaryStatus = (status: SessionItem["connection"]["status"]): "connected" | "disconnected" => {
  return status === "connected" ? "connected" : "disconnected";
};

export const SessionStatusPanel = ({ session }: SessionStatusPanelProps) => {
  const binaryStatus = getBinaryStatus(session.connection.status);
  const isConnected = binaryStatus === "connected";

  return (
    <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full opacity-20 pointer-events-none transition-colors duration-1000 ${isConnected ? "bg-emerald-500" : "bg-rose-500"}`}></div>
      
      <div className="flex items-center justify-between mb-6 relative z-10">
        <h2 className="text-xl font-display font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Estado de Sesion
        </h2>
        <span className={`px-3 py-1 text-xs font-bold rounded-full border border-transparent flex items-center gap-1.5 ${
          isConnected 
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
            : "bg-rose-500/10 text-rose-400 border-rose-500/30"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`}></span>
          {isConnected ? "Conectado" : "Desconectado"}
        </span>
      </div>

      <div className="space-y-4 relative z-10">
        <div>
          <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider mb-1">ID de Sesion</p>
          <p className="font-mono text-sm text-slate-300 bg-black/20 p-3 rounded-xl border border-white/5">{session.sessionId}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider mb-1">Ultima Actualizacion</p>
          <p className="text-sm text-slate-400">{new Date(session.connection.lastStatusAt).toLocaleString()}</p>
        </div>
      </div>
    </section>
  );
};

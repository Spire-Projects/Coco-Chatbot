import type { SessionItem } from "./types";

interface SessionSelectorProps {
  sessions: SessionItem[];
  selectedSessionId: string;
  onSelect: (sessionId: string) => void;
}

export const SessionSelector = ({
  sessions,
  selectedSessionId,
  onSelect
}: SessionSelectorProps) => {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-slate-400">
      <span className="flex items-center gap-2">
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 0 6h13.5a3 3 0 1 0 0-6m-16.5-3a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3m-19.5 0a4.5 4.5 0 0 1 .9-2.7L5.737 5.1a3.375 3.375 0 0 1 2.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 0 1 .9 2.7m0 0a3 3 0 0 1-3 3m0 3h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Zm-3 6h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Z" /></svg>
        Sesion activa
      </span>
      <div className="relative">
        <select
          className="w-full appearance-none bg-slate-900/60 border border-white/10 text-white rounded-xl py-3 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all font-mono text-sm shadow-inner cursor-pointer"
          value={selectedSessionId}
          onChange={(event) => onSelect(event.target.value)}
        >
          {sessions.map((session) => (
            <option key={session.sessionId} value={session.sessionId} className="bg-slate-900 text-white">
              {session.sessionId}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>
        </div>
      </div>
    </label>
  );
};

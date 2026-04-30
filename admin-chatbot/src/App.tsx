import { ConnectionPanel } from "./features/connection/ConnectionPanel";
import { PromptEditorPanel } from "./features/prompts/PromptEditorPanel";
import { api } from "./shared/api";
import { useConnectionEvents } from "./shared/useConnectionEvents";
import "./App.css";

function App() {
  const connectionState = useConnectionEvents(api.baseUrl);

  return (
    <main className="w-full max-w-4xl mx-auto px-4 py-8 md:py-12 grid gap-6 animate-in fade-in duration-500 slide-in-from-bottom-4">
      <header className="p-6 md:p-8 bg-black/20 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl shadow-black/40 relative overflow-hidden group">
        <div className="absolute inset-0 bg-linear-to-r from-fuchsia-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
        <div className="relative z-10">
          <p className="text-fuchsia-400 uppercase tracking-[0.15em] text-xs font-bold mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-fuchsia-500 animate-pulse"></span>
            Admin Chatbot
          </p>
          <h1 className="text-3xl md:text-4xl font-display font-medium tracking-tight text-white m-0">Editor de Prompt</h1>
        </div>
      </header>

      <ConnectionPanel state={connectionState} />

      <PromptEditorPanel />
    </main>
  );
}

export default App;

import { useState } from "react";
import { ConnectionPanel } from "./features/connection/ConnectionPanel";
import { PromptEditorPanel } from "./features/prompts/PromptEditorPanel";
import { ChatsView } from "./features/chats/ChatsView";
import { api } from "./shared/api";
import { useConnectionEvents } from "./shared/useConnectionEvents";
import "./App.css";

type Tab = "config" | "chats";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: "config",
    label: "Configuración",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: "chats",
    label: "Chats",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
];

function App() {
  const connectionState = useConnectionEvents(api.baseUrl);
  const [activeTab, setActiveTab] = useState<Tab>("config");

  return (
    <main className="w-full max-w-6xl mx-auto px-4 py-8 md:py-12 grid gap-6 animate-in fade-in duration-500 slide-in-from-bottom-4">
      {/* Header */}
      <header className="p-6 md:p-8 bg-black/20 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl shadow-black/40 relative overflow-hidden group">
        <div className="absolute inset-0 bg-linear-to-r from-fuchsia-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-fuchsia-400 uppercase tracking-[0.15em] text-xs font-bold mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-fuchsia-500 animate-pulse" />
              Admin Chatbot
            </p>
            <h1 className="text-3xl md:text-4xl font-display font-medium tracking-tight text-white m-0">Coco Chatbot</h1>
          </div>
          {/* Tabs */}
          <nav className="flex gap-1 bg-white/5 border border-white/10 rounded-2xl p-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-white/10 text-white shadow"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Tab: Configuración */}
      {activeTab === "config" && (
        <div className="grid gap-6 animate-in fade-in duration-300">
          <ConnectionPanel state={connectionState} />
          <PromptEditorPanel />
        </div>
      )}

      {/* Tab: Chats */}
      {activeTab === "chats" && (
        <div className="animate-in fade-in duration-300">
          <ChatsView />
        </div>
      )}
    </main>
  );
}

export default App;

import { useEffect, useMemo, useState } from "react";
import { api } from "../../shared/api";

export const PromptEditorPanel = () => {
  const [globalPrompt, setGlobalPrompt] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPublishingGlobal, setIsPublishingGlobal] = useState(false);

  const canPublishGlobal = useMemo(() => Boolean(globalPrompt.trim()), [globalPrompt]);

  const loadPromptData = async () => {
    setIsLoading(true);
    try {
      const globalCurrent = await api.getGlobalPrompt();
      setGlobalPrompt(globalCurrent.content);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cargar el prompt.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPromptData();
  }, []);

  const publishGlobal = async () => {
    if (!canPublishGlobal) {
      return;
    }

    setIsPublishingGlobal(true);
    try {
      const globalSaved = await api.updateGlobalPrompt(globalPrompt.trim());
      await loadPromptData();
      setMessage(`Prompt global actualizado (${globalSaved.updatedAt}).`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar el prompt global.");
    } finally {
      setIsPublishingGlobal(false);
    }
  };

  return (
    <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden mt-2">
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-fuchsia-500/10 blur-[80px] rounded-full pointer-events-none"></div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10 border-b border-white/10 pb-6">
        <div>
          <h2 className="text-2xl font-display font-semibold flex items-center gap-3">
            <svg className="w-6 h-6 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Prompt del Bot
          </h2>
          <p className="text-sm text-slate-400 mt-2">Edita las instrucciones del asistente y publica para aplicar los cambios.</p>
        </div>

        <div className="flex gap-3 flex-wrap">
          <button
            className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
            onClick={() => void loadPromptData()}
            disabled={isLoading || isPublishingGlobal}
          >
            <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Recargar
          </button>
          <button
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 rounded-xl font-medium transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2 text-sm"
            onClick={() => void publishGlobal()}
            disabled={!canPublishGlobal || isLoading || isPublishingGlobal}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
            {isPublishingGlobal ? "Guardando..." : "Guardar prompt"}
          </button>
        </div>
      </div>

      <div className="relative z-10">
        <label className="flex flex-col gap-3">
          <span className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-fuchsia-500"></span>
            Instrucciones del asistente
          </span>
          <textarea
            className="w-full bg-slate-900/50 border border-white/10 text-slate-300 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 focus:border-fuchsia-500/50 transition-all font-mono text-sm leading-relaxed resize-y min-h-[300px] shadow-inner"
            value={globalPrompt}
            onChange={(event) => setGlobalPrompt(event.target.value)}
            rows={14}
            placeholder="Introduce las instrucciones del asistente..."
          />
        </label>
      </div>

      {message ? (
        <div className="mt-6 bg-slate-800/50 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-slate-300 text-sm font-medium">{message}</p>
        </div>
      ) : null}
    </section>
  );
};

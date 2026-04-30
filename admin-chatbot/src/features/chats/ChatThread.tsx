import { useEffect, useRef, useState } from "react";
import type { ChatRow, MessageRow } from "../sessions/types";
import { api } from "../../shared/api";

interface ChatThreadProps {
  chat: ChatRow;
}

const PAGE_SIZE = 20;

const formatMsgTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const formatDateSeparator = (iso: string): string =>
  new Date(iso).toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const isSameDay = (a: string, b: string): boolean =>
  new Date(a).toDateString() === new Date(b).toDateString();

export const ChatThread = ({ chat }: ChatThreadProps) => {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load initial page
  useEffect(() => {
    let cancelled = false;
    setMessages([]);
    setOffset(0);
    setTotal(0);
    setError("");
    setIsLoading(true);

    api.listMessages(chat.phone, PAGE_SIZE, 0).then((page) => {
      if (cancelled) return;
      // Messages come newest-first from API; we reverse for display (oldest at top)
      setMessages([...page.messages].reverse());
      setTotal(page.total);
      setOffset(page.messages.length);
      setIsLoading(false);

      // Scroll to bottom after initial load
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    }).catch((err: unknown) => {
      if (cancelled) return;
      setError(err instanceof Error ? err.message : "Error al cargar mensajes");
      setIsLoading(false);
    });

    return () => { cancelled = true; };
  }, [chat.phone]);

  const loadOlder = async () => {
    if (isLoadingMore || offset >= total) return;
    setIsLoadingMore(true);

    try {
      const page = await api.listMessages(chat.phone, PAGE_SIZE, offset);
      const older = [...page.messages].reverse();
      const prevHeight = scrollRef.current?.scrollHeight ?? 0;

      setMessages((prev) => [...older, ...prev]);
      setOffset((prev) => prev + page.messages.length);

      // Maintain scroll position after prepend
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight - prevHeight;
        }
      });
    } catch {
      // silently ignore
    } finally {
      setIsLoadingMore(false);
    }
  };

  const name = chat.contactName ?? chat.phone;
  const initials = chat.contactName
    ? chat.contactName.trim().split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase()
    : chat.phone.slice(-2);

  return (
    <div className="flex flex-col h-full bg-[#0b141a]">
      {/* Chat header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#202c33] shrink-0 border-b border-white/5">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-sm font-bold text-white select-none shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold truncate">{name}</p>
          {chat.contactName && (
            <p className="text-slate-400 text-xs font-mono truncate">{chat.phone}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-slate-500 text-xs">{total} turnos</p>
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)", backgroundSize: "24px 24px" }}
      >
        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-slate-700 border-t-emerald-400 animate-spin" />
          </div>
        )}

        {error && (
          <p className="text-rose-400 text-sm text-center py-8">{error}</p>
        )}

        {!isLoading && !error && (
          <>
            {/* Load older trigger */}
            <div ref={topSentinelRef} className="flex justify-center mb-2">
              {offset < total ? (
                <button
                  type="button"
                  onClick={() => void loadOlder()}
                  disabled={isLoadingMore}
                  className="text-xs text-slate-400 bg-[#202c33] hover:bg-[#2a3942] border border-white/10 px-4 py-1.5 rounded-full transition-colors disabled:opacity-50"
                >
                  {isLoadingMore ? "Cargando mensajes anteriores..." : `Ver ${Math.min(PAGE_SIZE, total - offset)} mensajes anteriores`}
                </button>
              ) : (
                <span className="text-xs text-slate-600 bg-[#202c33] px-3 py-1 rounded-full">Inicio de la conversación</span>
              )}
            </div>

            {/* Message bubbles */}
            {messages.map((msg, index) => {
              const prevMsg = index > 0 ? messages[index - 1] : null;
              const showDateSep = !prevMsg || !isSameDay(prevMsg.sentAt, msg.sentAt);
              const time = formatMsgTime(msg.sentAt);

              return (
                <div key={msg.id}>
                  {showDateSep && (
                    <div className="flex justify-center my-4">
                      <span className="text-xs text-slate-400 bg-[#182229] px-3 py-1 rounded-full shadow">
                        {formatDateSeparator(msg.sentAt)}
                      </span>
                    </div>
                  )}

                  {/* User turn */}
                  <div className="flex justify-end mb-1">
                    <div className="max-w-[75%] bg-[#005c4b] text-white text-sm px-3 py-2 rounded-tl-2xl rounded-tr-sm rounded-b-2xl shadow-sm">
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.userMessage}</p>
                      <p className="text-[10px] text-emerald-300/70 text-right mt-1">{time}</p>
                    </div>
                  </div>

                  {/* Bot turn */}
                  <div className="flex justify-start mb-3">
                    <div className="max-w-[75%] bg-[#202c33] text-slate-100 text-sm px-3 py-2 rounded-tl-sm rounded-tr-2xl rounded-b-2xl shadow-sm">
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.botReply}</p>
                      <div className="flex items-center gap-2 justify-end mt-1">
                        {msg.intent && msg.intent !== "query" && (
                          <span className="text-[9px] text-slate-500 uppercase tracking-wide">{msg.intent}</span>
                        )}
                        <p className="text-[10px] text-slate-500">{time}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};

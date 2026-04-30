import { useEffect, useState } from "react";
import type { ChatRow } from "../sessions/types";
import { api } from "../../shared/api";
import { ChatList } from "./ChatList";
import { ChatThread } from "./ChatThread";

const LIST_PAGE = 30;

export const ChatsView = () => {
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);

  const selectedChat = chats.find((c) => c.phone === selectedPhone) ?? null;

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError("");

    api.listChats(LIST_PAGE, 0).then((page) => {
      if (cancelled) return;
      setChats(page.chats);
      setTotal(page.total);
      if (page.chats.length > 0 && !selectedPhone) {
        setSelectedPhone(page.chats[0].phone);
      }
      setIsLoading(false);
    }).catch((err: unknown) => {
      if (cancelled) return;
      setError(err instanceof Error ? err.message : "Error al cargar chats");
      setIsLoading(false);
    });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = async () => {
    if (isLoadingMore || chats.length >= total) return;
    setIsLoadingMore(true);
    try {
      const page = await api.listChats(LIST_PAGE, chats.length);
      setChats((prev) => [...prev, ...page.chats]);
      setTotal(page.total);
    } catch {
      // silently ignore
    } finally {
      setIsLoadingMore(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="w-8 h-8 rounded-full border-4 border-slate-700 border-t-emerald-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <p className="text-rose-400 bg-rose-500/10 border border-rose-500/20 px-6 py-3 rounded-xl text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50" style={{ height: "calc(100vh - 220px)", minHeight: "500px" }}>
      <div className="grid grid-cols-[320px_1fr] h-full">
        <ChatList
          chats={chats}
          total={total}
          selectedPhone={selectedPhone}
          isLoadingMore={isLoadingMore}
          onSelect={setSelectedPhone}
          onLoadMore={() => void loadMore()}
        />

        <div className="h-full overflow-hidden">
          {selectedChat ? (
            <ChatThread chat={selectedChat} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full bg-[#0b141a] text-slate-500 gap-3">
              <svg className="w-16 h-16 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm">Selecciona un chat para ver la conversación</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

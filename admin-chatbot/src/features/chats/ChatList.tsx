import type { ChatRow } from "../sessions/types";

interface ChatListItemProps {
  chat: ChatRow;
  isSelected: boolean;
  onClick: () => void;
}

const formatTime = (iso: string): string => {
  const date = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000);

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  }
  return date.toLocaleDateString([], { day: "2-digit", month: "2-digit", year: "2-digit" });
};

const getInitials = (name: string | null, phone: string): string => {
  if (name) {
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return phone.slice(-2);
};

interface ChatListProps {
  chats: ChatRow[];
  total: number;
  selectedPhone: string | null;
  isLoadingMore: boolean;
  onSelect: (phone: string) => void;
  onLoadMore: () => void;
}

export const ChatList = ({ chats, total, selectedPhone, isLoadingMore, onSelect, onLoadMore }: ChatListProps) => {
  return (
    <aside className="flex flex-col h-full bg-[#111b21] border-r border-white/5">
      {/* Header */}
      <div className="px-4 py-4 bg-[#202c33] flex items-center justify-between shrink-0">
        <h2 className="text-white font-semibold text-base">Chats</h2>
        <span className="text-xs text-slate-400 bg-white/5 px-2 py-0.5 rounded-full">{total}</span>
      </div>

      {/* List */}
      <ul className="flex-1 overflow-y-auto divide-y divide-white/5">
        {chats.length === 0 && (
          <li className="px-4 py-8 text-center text-slate-500 text-sm">No hay conversaciones aún</li>
        )}
        {chats.map((chat) => {
          const name = chat.contactName ?? chat.phone;
          const initials = getInitials(chat.contactName, chat.phone);
          const isActive = selectedPhone === chat.phone;

          return (
            <li key={chat.phone}>
              <button
                type="button"
                onClick={() => onSelect(chat.phone)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#2a3942] transition-colors text-left ${isActive ? "bg-[#2a3942]" : ""}`}
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center shrink-0 text-sm font-bold text-white select-none">
                  {initials}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-white text-sm font-medium truncate">{name}</span>
                    <span className="text-slate-500 text-xs shrink-0">{formatTime(chat.lastMessageAt)}</span>
                  </div>
                  {chat.contactName && (
                    <span className="text-slate-500 text-xs font-mono">{chat.phone}</span>
                  )}
                </div>
              </button>
            </li>
          );
        })}

        {/* Load more */}
        {chats.length < total && (
          <li className="px-4 py-3 flex justify-center">
            <button
              type="button"
              onClick={onLoadMore}
              disabled={isLoadingMore}
              className="text-emerald-400 text-xs font-medium hover:text-emerald-300 disabled:opacity-50 transition-colors"
            >
              {isLoadingMore ? "Cargando..." : `Ver más (${total - chats.length} restantes)`}
            </button>
          </li>
        )}
      </ul>
    </aside>
  );
};

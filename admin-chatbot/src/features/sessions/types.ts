export type ConnectionStatus = "starting" | "waiting_qr" | "connected" | "reconnecting";

export interface ConnectionState {
  status: ConnectionStatus;
  qrRaw: string | null;
}

export interface PromptState {
  content: string;
  updatedAt: string;
}

// ── Chats ─────────────────────────────────────────────────────────────────────

export interface ChatRow {
  phone: string;
  contactName: string | null;
  firstSeen: string;
  lastMessageAt: string;
}

export interface MessageRow {
  id: number;
  phone: string;
  userMessage: string;
  botReply: string;
  intent: string;
  sentAt: string;
}

export interface ChatsPage {
  chats: ChatRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface MessagesPage {
  messages: MessageRow[];
  total: number;
  limit: number;
  offset: number;
}

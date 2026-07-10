import type { ChatsPage, ConnectionState, MessagesPage, PromptState } from "../features/sessions/types";

const envUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
const API_BASE_URL = envUrl || "";
if (!API_BASE_URL) {
  console.warn("VITE_API_BASE_URL no está definida. Usando same-origin (/api). Agrega la variable de entorno si el backend está en otro dominio.");
}

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }

  return (await response.json()) as T;
};

export const api = {
  baseUrl: API_BASE_URL,
  getStatus: async (): Promise<ConnectionState> => {
    return request<ConnectionState>("/api/status");
  },
  getGlobalPrompt: async (): Promise<PromptState> => {
    return request<PromptState>("/api/prompts/global");
  },
  updateGlobalPrompt: async (content: string): Promise<PromptState> => {
    return request<PromptState>("/api/prompts/global", {
      method: "PUT",
      body: JSON.stringify({ content })
    });
  },
  listChats: async (limit = 30, offset = 0): Promise<ChatsPage> => {
    return request<ChatsPage>(`/api/chats?limit=${limit}&offset=${offset}`);
  },
  listMessages: async (phone: string, limit = 20, offset = 0): Promise<MessagesPage> => {
    return request<MessagesPage>(`/api/chats/${encodeURIComponent(phone)}/messages?limit=${limit}&offset=${offset}`);
  }
};

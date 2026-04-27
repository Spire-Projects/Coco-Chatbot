import type {
  PromptState,
  SessionConnectionState,
  SessionItem,
  SessionsResponse
} from "../features/sessions/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;
if (!API_BASE_URL) {
  throw new Error("VITE_API_BASE_URL no está definida. Agrega la variable de entorno antes de compilar.");
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
  getSessions: async (): Promise<SessionsResponse> => {
    return request<SessionsResponse>("/api/sessions");
  },
  getSession: async (sessionId: string): Promise<SessionItem> => {
    return request<SessionItem>(`/api/sessions/${sessionId}`);
  },
  getConnection: async (sessionId: string): Promise<SessionConnectionState> => {
    return request<SessionConnectionState>(`/api/sessions/${sessionId}/connection`);
  },
  getGlobalPrompt: async (): Promise<PromptState> => {
    return request<PromptState>("/api/prompts/global");
  },
  getSessionPrompt: async (sessionId: string): Promise<PromptState> => {
    return request<PromptState>(`/api/prompts/sessions/${sessionId}`);
  },
  updateGlobalPrompt: async (content: string): Promise<PromptState> => {
    return request<PromptState>("/api/prompts/global", {
      method: "PUT",
      body: JSON.stringify({ content })
    });
  },
  updateSessionPrompt: async (
    sessionId: string,
    content: string
  ): Promise<PromptState> => {
    return request<PromptState>(`/api/prompts/sessions/${sessionId}`, {
      method: "PUT",
      body: JSON.stringify({ content })
    });
  }
};

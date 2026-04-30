import type { ConnectionState, PromptState } from "../features/sessions/types";

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
  }
};

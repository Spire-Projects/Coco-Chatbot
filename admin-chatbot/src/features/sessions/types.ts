export type ConnectionStatus = "starting" | "waiting_qr" | "connected" | "reconnecting";

export interface ConnectionState {
  status: ConnectionStatus;
  qrRaw: string | null;
}

export interface PromptState {
  content: string;
  updatedAt: string;
}

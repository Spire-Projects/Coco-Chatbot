export type ConnectionStatus =
  | "starting"
  | "waiting_qr"
  | "connected"
  | "reconnecting"
  | "disconnected";

export interface SessionConnectionState {
  sessionId: string;
  status: ConnectionStatus;
  attempts: number;
  hasQr: boolean;
  qrRaw: string | null;
  qrUpdatedAt: string | null;
  lastStatusAt: string;
  lastDisconnectCode: number | null;
}

export interface SessionAgent {
  label: string;
  phone: string;
  shift: string;
}

export interface SessionItem {
  sessionId: string;
  authDirName: string;
  sessionPhone: string;
  storeLocation: string;
  mapsUrl?: string;
  businessHours: string;
  agents: SessionAgent[];
  connection: SessionConnectionState;
}

export interface SessionsResponse {
  total: number;
  sessionIds: string[];
  sessions: SessionItem[];
}

export interface PromptState {
  content: string;
  updatedAt: string;
}

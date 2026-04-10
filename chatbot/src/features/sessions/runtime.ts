import { EventEmitter } from "node:events";
import { sessionProfiles } from "../../config/sessions.js";

export type SessionConnectionStatus =
  | "starting"
  | "waiting_qr"
  | "connected"
  | "reconnecting"
  | "disconnected";

export interface SessionRuntimePublicState {
  sessionId: string;
  status: SessionConnectionStatus;
  attempts: number;
  hasQr: boolean;
  qrRaw: string | null;
  qrUpdatedAt: string | null;
  lastStatusAt: string;
  lastDisconnectCode: number | null;
}

const emitter = new EventEmitter();
emitter.setMaxListeners(100);

const nowIso = () => new Date().toISOString();

const stateBySession = new Map<string, SessionRuntimePublicState>(
  sessionProfiles.map((profile) => [
    profile.sessionId,
    {
      sessionId: profile.sessionId,
      status: "starting",
      attempts: 0,
      hasQr: false,
      qrRaw: null,
      qrUpdatedAt: null,
      lastStatusAt: nowIso(),
      lastDisconnectCode: null
    }
  ])
);

const emitState = (sessionId: string) => {
  const current = stateBySession.get(sessionId);
  if (!current) {
    return;
  }

  emitter.emit(`session:${sessionId}:state`, current);
};

const ensureSession = (sessionId: string): SessionRuntimePublicState => {
  const existing = stateBySession.get(sessionId);
  if (existing) {
    return existing;
  }

  const created: SessionRuntimePublicState = {
    sessionId,
    status: "starting",
    attempts: 0,
    hasQr: false,
    qrRaw: null,
    qrUpdatedAt: null,
    lastStatusAt: nowIso(),
    lastDisconnectCode: null
  };

  stateBySession.set(sessionId, created);
  return created;
};

export const updateSessionStatus = (
  sessionId: string,
  patch: Partial<Omit<SessionRuntimePublicState, "sessionId">>
): SessionRuntimePublicState => {
  const current = ensureSession(sessionId);
  const next: SessionRuntimePublicState = {
    ...current,
    ...patch,
    sessionId,
    lastStatusAt: nowIso()
  };

  stateBySession.set(sessionId, next);
  emitState(sessionId);

  return next;
};

export const setSessionQrRaw = (sessionId: string, qrRaw: string): SessionRuntimePublicState => {
  return updateSessionStatus(sessionId, {
    status: "waiting_qr",
    hasQr: true,
    qrRaw,
    qrUpdatedAt: nowIso()
  });
};

export const clearSessionQr = (sessionId: string): SessionRuntimePublicState => {
  return updateSessionStatus(sessionId, {
    hasQr: false,
    qrRaw: null,
    qrUpdatedAt: null
  });
};

export const getSessionRuntimeState = (sessionId: string): SessionRuntimePublicState => {
  return ensureSession(sessionId);
};

export const listSessionRuntimeStates = (): SessionRuntimePublicState[] => {
  return sessionProfiles.map((profile) => ensureSession(profile.sessionId));
};

export const subscribeSessionEvents = (
  sessionId: string,
  listener: (state: SessionRuntimePublicState) => void
): (() => void) => {
  const topic = `session:${sessionId}:state`;
  const wrapped = (payload: SessionRuntimePublicState) => listener(payload);
  emitter.on(topic, wrapped);

  return () => {
    emitter.off(topic, wrapped);
  };
};

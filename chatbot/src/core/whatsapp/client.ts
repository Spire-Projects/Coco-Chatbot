import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
  type WASocket
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import qrcode from "qrcode-terminal";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { env } from "../../config/env.js";
import {
  resolveSessionSelector,
  sessionProfiles,
  type SessionStoreProfile
} from "../../config/sessions.js";
import {
  clearSessionQr,
  setSessionQrRaw,
  updateSessionStatus
} from "../../features/sessions/runtime.js";
import { logger } from "../logger.js";
import { registerSocketEvents } from "./events.js";

const AUTH_ROOT = join(process.cwd(), "auth");

interface SessionRuntimeState {
  attempts: number;
  generation: number;
  starting?: Promise<void>;
  socket?: WASocket;
  reconnectTimer?: NodeJS.Timeout;
}

const runtimeState = new Map<string, SessionRuntimeState>();

const getState = (sessionId: string): SessionRuntimeState => {
  const current = runtimeState.get(sessionId);
  if (current) {
    return current;
  }

  const created: SessionRuntimeState = {
    attempts: 0,
    generation: 0
  };
  runtimeState.set(sessionId, created);
  return created;
};

const computeReconnectDelayMs = (attempt: number): number => {
  const baseDelay = 700;
  const cappedAttempt = Math.min(attempt, 6);
  return Math.min(20000, baseDelay * 2 ** cappedAttempt);
};

const clearReconnectTimer = (state: SessionRuntimeState) => {
  if (state.reconnectTimer) {
    clearTimeout(state.reconnectTimer);
    state.reconnectTimer = undefined;
  }
};

const scheduleReconnect = (
  profile: SessionStoreProfile,
  delayMs: number,
  clearAuthBeforeReconnect: boolean
) => {
  const authDir = join(AUTH_ROOT, profile.authDirName);
  const stateRef = getState(profile.sessionId);

  clearReconnectTimer(stateRef);

  stateRef.reconnectTimer = setTimeout(() => {
    if (clearAuthBeforeReconnect) {
      rmSync(authDir, { recursive: true, force: true });
      logger.warn(
        { sessionId: profile.sessionId },
        "Credenciales limpiadas antes de reconectar para recuperar la sesion."
      );
    }

    startSingleSession(profile).catch((error) => {
      logger.error({ error, sessionId: profile.sessionId }, "Error al reiniciar el cliente");
    });
  }, delayMs);
};

const startSingleSession = async (profile: SessionStoreProfile): Promise<void> => {
  const stateRef = getState(profile.sessionId);
  if (stateRef.starting) {
    return stateRef.starting;
  }

  stateRef.starting = (async () => {
  const authDir = join(AUTH_ROOT, profile.authDirName);
  clearReconnectTimer(stateRef);
  updateSessionStatus(profile.sessionId, {
    status: "starting",
    attempts: stateRef.attempts,
    lastDisconnectCode: null
  });

  if (stateRef.socket) {
    try {
      stateRef.socket.end(new Error("Restarting session"));
    } catch {
      // No-op: the socket might already be closed.
    }
  }

  stateRef.generation += 1;
  const generation = stateRef.generation;

  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version, isLatest } = await fetchLatestBaileysVersion();

  logger.debug({ version, isLatest, sessionId: profile.sessionId }, "Version de Baileys cargada");

  const baileysLogger = pino({ level: env.BAILEYS_LOG_LEVEL });
  const keyStoreLogger = pino({ level: "fatal" });

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, keyStoreLogger)
    },
    printQRInTerminal: false,
    logger: baileysLogger
  });
  stateRef.socket = sock;

  registerSocketEvents(sock, profile);
  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    if (generation !== stateRef.generation) {
      return;
    }

    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      setSessionQrRaw(profile.sessionId, qr);
      logger.info({ sessionId: profile.sessionId }, "QR generado. Escanealo con WhatsApp.");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      clearReconnectTimer(stateRef);
      stateRef.attempts = 0;
      clearSessionQr(profile.sessionId);
      updateSessionStatus(profile.sessionId, {
        status: "connected",
        attempts: stateRef.attempts,
        lastDisconnectCode: null
      });
      logger.info({ sessionId: profile.sessionId }, "Conexion abierta correctamente.");
      return;
    }

    if (connection === "close") {
      stateRef.attempts += 1;

      const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      const connectionReplaced = statusCode === DisconnectReason.connectionReplaced;
      const restartRequired = statusCode === DisconnectReason.restartRequired;
      const badSession = statusCode === DisconnectReason.badSession;
      const shouldReconnect = !loggedOut;
      const reconnectDelayMs = computeReconnectDelayMs(stateRef.attempts);

      const closeLogPayload = {
        statusCode,
        loggedOut,
        connectionReplaced,
        restartRequired,
        badSession,
        shouldReconnect,
        attempt: stateRef.attempts,
        reconnectDelayMs,
        sessionId: profile.sessionId
      };

      updateSessionStatus(profile.sessionId, {
        status: shouldReconnect ? "reconnecting" : "disconnected",
        attempts: stateRef.attempts,
        lastDisconnectCode: statusCode ?? null
      });

      if (!shouldReconnect) {
        rmSync(authDir, { recursive: true, force: true });
        clearSessionQr(profile.sessionId);
        logger.warn(
          { sessionId: profile.sessionId, statusCode },
          "Sesion cerrada por logout. Se limpiaron credenciales y se requiere nuevo QR."
        );
        scheduleReconnect(profile, 600, false);
        return;
      }

      if (restartRequired) {
        logger.info(
          { sessionId: profile.sessionId, statusCode },
          "WA solicito reinicio de sesion (515). Reconexion automatica en curso."
        );
      } else if (connectionReplaced && stateRef.attempts < 3) {
        logger.debug(closeLogPayload, "Conexion reemplazada. Reintento controlado.");
      } else {
        logger.warn(closeLogPayload, "Conexion cerrada. Reiniciando para generar nueva sesion/QR.");
      }

      let delayMs = reconnectDelayMs;
      if (restartRequired) {
        delayMs = 500;
      }

      if (connectionReplaced) {
        delayMs = Math.max(delayMs, 5000);
      }

      if (badSession && stateRef.attempts >= 2) {
        delayMs = Math.max(delayMs, 1500);
      }

      const clearAuthBeforeReconnect = badSession && stateRef.attempts >= 2;

      logger.info({ sessionId: profile.sessionId, delayMs, attempt: stateRef.attempts }, "Programando reconexion de sesion");
      scheduleReconnect(profile, delayMs, clearAuthBeforeReconnect);
    }
  });
  })().finally(() => {
    stateRef.starting = undefined;
  });

  return stateRef.starting;
};

export const startWhatsAppClients = async (): Promise<void> => {
  const enabledSelectors = env.ACTIVE_SESSION_IDS;
  const selectedProfiles =
    enabledSelectors.length > 0
      ? enabledSelectors
          .map((selector) => resolveSessionSelector(selector))
          .filter((profile): profile is SessionStoreProfile => Boolean(profile))
      : sessionProfiles.slice(0, 1);

  const unknownSelectors = enabledSelectors.filter((selector) => !resolveSessionSelector(selector));

  if (selectedProfiles.length === 0) {
    logger.error(
      { activeSessionIds: env.ACTIVE_SESSION_IDS },
      "No hay sesiones activas validas. Revisa ACTIVE_SESSION_IDS en .env"
    );
    return;
  }

  logger.info(
    {
      activeSessionIds: selectedProfiles.map((profile) => profile.sessionId),
      activeAuthDirs: selectedProfiles.map((profile) => profile.authDirName),
      unknownSelectors,
      disabledSessionIds: sessionProfiles
        .filter((profile) => !selectedProfiles.some((selected) => selected.sessionId === profile.sessionId))
        .map((profile) => profile.sessionId)
    },
    "Inicio en modo sesion controlada"
  );

  for (const profile of selectedProfiles) {
    startSingleSession(profile).catch((error) => {
      logger.error({ error, sessionId: profile.sessionId }, "No se pudo iniciar una sesion");
    });
  }
};

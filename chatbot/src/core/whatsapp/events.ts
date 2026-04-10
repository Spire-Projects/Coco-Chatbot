import type { WASocket } from "@whiskeysockets/baileys";
import { env } from "../../config/env.js";
import { logger } from "../logger.js";
import type { SessionStoreProfile } from "../../config/sessions.js";
import {
  getIncomingMessageText,
  handleSalesMessage
} from "../../features/sales-assistant/handler.js";

interface PendingMessageBatch {
  jid: string;
  texts: string[];
  idleTimer: NodeJS.Timeout;
  maxWaitTimer: NodeJS.Timeout;
}

const pendingBatches = new Map<string, PendingMessageBatch>();

const extractDigits = (value: string): string => value.replace(/\D/g, "");

const isDirectJid = (jid: string): boolean => {
  return jid.endsWith("@s.whatsapp.net") || jid.endsWith("@lid");
};

const isAllowedSender = (remoteJid: string): boolean => {
  if (!env.TEST_RESTRICT_SENDERS) {
    return true;
  }

  if (env.TEST_ALLOWED_SENDERS.length === 0) {
    return false;
  }

  const jidDigits = extractDigits(remoteJid);

  return env.TEST_ALLOWED_SENDERS.some((entry) => {
    const entryDigits = extractDigits(entry);
    if (!entryDigits) {
      return false;
    }

    if (remoteJid === entry) {
      return true;
    }

    return jidDigits === entryDigits;
  });
};

export const registerSocketEvents = (sock: WASocket, sessionProfile: SessionStoreProfile) => {
  const flushBatch = async (batchKey: string, reason: "idle" | "max-wait"): Promise<void> => {
    const current = pendingBatches.get(batchKey);
    if (!current) {
      return;
    }

    clearTimeout(current.idleTimer);
    clearTimeout(current.maxWaitTimer);
    pendingBatches.delete(batchKey);

    const combinedText = current.texts.join("\n").trim();
    if (!combinedText) {
      return;
    }

    logger.info(
      {
        sessionId: sessionProfile.sessionId,
        remoteJid: current.jid,
        parts: current.texts.length,
        flushReason: reason,
        combinedText
      },
      "Lote de mensajes consolidado para respuesta unica"
    );

    await handleSalesMessage(sock, {
      sessionProfile,
      jid: current.jid,
      text: combinedText
    });
  };

  const enqueueMessage = (jid: string, text: string) => {
    const batchKey = `${sessionProfile.sessionId}:${jid}`;
    const current = pendingBatches.get(batchKey);

    if (current) {
      clearTimeout(current.idleTimer);
      current.texts.push(text);

      current.idleTimer = setTimeout(() => {
        flushBatch(batchKey, "idle").catch((error) => {
          logger.error({ error, jid, sessionId: sessionProfile.sessionId }, "Fallo al procesar lote de mensajes");
        });
      }, env.MESSAGE_BATCH_WINDOW_MS);

      return;
    }

    const idleTimer = setTimeout(() => {
      flushBatch(batchKey, "idle").catch((error) => {
        logger.error({ error, jid, sessionId: sessionProfile.sessionId }, "Fallo al procesar lote de mensajes");
      });
    }, env.MESSAGE_BATCH_WINDOW_MS);

    const maxWaitTimer = setTimeout(() => {
      flushBatch(batchKey, "max-wait").catch((error) => {
        logger.error({ error, jid, sessionId: sessionProfile.sessionId }, "Fallo al procesar lote de mensajes");
      });
    }, env.MESSAGE_BATCH_MAX_WAIT_MS);

    pendingBatches.set(batchKey, { jid, texts: [text], idleTimer, maxWaitTimer });
  };

  sock.ev.on("messages.upsert", async (payload) => {
    for (const msg of payload.messages) {
      if (msg.key.fromMe || !msg.key.remoteJid || msg.key.remoteJid === "status@broadcast") {
        continue;
      }

      if (env.TEST_DIRECT_ONLY && !isDirectJid(msg.key.remoteJid)) {
        if (env.LOG_IGNORED_MESSAGES) {
          logger.info(
            { sessionId: sessionProfile.sessionId, remoteJid: msg.key.remoteJid },
            "Mensaje ignorado por no ser chat directo"
          );
        }
        continue;
      }

      if (!isAllowedSender(msg.key.remoteJid)) {
        if (env.LOG_IGNORED_MESSAGES) {
          logger.info(
            { sessionId: sessionProfile.sessionId, remoteJid: msg.key.remoteJid },
            "Mensaje ignorado: remitente fuera de la lista permitida"
          );
        }
        continue;
      }

      const text = getIncomingMessageText(msg.message);
      if (!text) {
        continue;
      }

      logger.info(
        {
          sessionId: sessionProfile.sessionId,
          remoteJid: msg.key.remoteJid,
          messageId: msg.key.id,
          type: payload.type,
          text
        },
        "Mensaje entrante procesado"
      );

      enqueueMessage(msg.key.remoteJid, text);
    }
  });
};

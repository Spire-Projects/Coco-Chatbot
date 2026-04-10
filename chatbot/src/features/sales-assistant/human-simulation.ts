import type { WASocket } from "@whiskeysockets/baileys";
import { logger } from "../../core/logger.js";

const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const calculateDelay = (textLength: number): number => {
  // Formula: 30 ms per character, constrained between 1500 and 8000 ms
  const baseDelay = textLength * 30;

  // Add random jitter (±400 ms)
  const jitter = Math.random() * 800 - 400;
  let delay = baseDelay + jitter;

  // Apply bounds
  if (delay < 1500) {
    delay = 1500;
  } else if (delay > 8000) {
    delay = 8000;
  }

  return Math.round(delay);
};

export const respondWithHumanSimulation = async (
  sock: WASocket,
  jid: string,
  messageText: string
): Promise<void> => {
  const charCount = messageText.length;
  const delayMs = calculateDelay(charCount);

  logger.info(
    {
      jid,
      charCount,
      delayMs,
      formula: "chars * 30 ms"
    },
    "Iniciando respuesta con simulacion humana"
  );

  try {
    // 1. Activate "typing" state
    await sock.sendPresenceUpdate("composing", jid);
    logger.debug({ jid, state: "composing" }, "Estado escribiendo activado");
  } catch (error) {
    logger.warn(
      { jid, error: error instanceof Error ? error.message : String(error) },
      "Fallo al activar estado composing, continuando sin presencia"
    );
  }

  try {
    // 2. Wait for calculated delay
    await sleep(delayMs);

    // 3. Deactivate "typing" state
    await sock.sendPresenceUpdate("paused", jid);
    logger.debug({ jid, state: "paused" }, "Estado escribiendo desactivado");
  } catch (error) {
    logger.warn(
      { jid, error: error instanceof Error ? error.message : String(error) },
      "Fallo al desactivar estado, continuando con envio"
    );
  }

  try {
    // 4. Send the actual message
    await sock.sendMessage(jid, { text: messageText });
    logger.info(
      {
        jid,
        charCount,
        delayMs,
        messagePreview: messageText.substring(0, 50)
      },
      "Mensaje enviado tras simulacion humana"
    );
  } catch (error) {
    logger.error(
      { jid, error, charCount, delayMs },
      "Fallo al enviar mensaje tras simulacion humana"
    );
    throw error;
  }
};

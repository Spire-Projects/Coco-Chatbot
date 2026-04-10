import type { WASocket } from "@whiskeysockets/baileys";
import type { SessionStoreProfile } from "../../config/sessions.js";
import { logger } from "../../core/logger.js";
import { getCatalogItems, findRelevantCatalogItems } from "./catalog.js";
import { generateSalesReply } from "./gemini.js";
import { detectIntent } from "./intent.js";
import { respondWithHumanSimulation } from "./human-simulation.js";
import {
  addConversationTurnScoped,
  clearConversationMemoryScoped,
  getConversationMemoryScoped
} from "./memory.js";

const extractTextFromMessage = (message: any): string => {
  return (
    message?.conversation ||
    message?.extendedTextMessage?.text ||
    message?.imageMessage?.caption ||
    message?.videoMessage?.caption ||
    ""
  ).trim();
};

const extractBudgetUsd = (text: string): string | undefined => {
  const match = text.match(/\$\s?(\d{2,5})|(\d{2,5})\s?usd/i);
  if (!match) {
    return undefined;
  }

  return (match[1] || match[2] || "").trim();
};

export const handleSalesMessage = async (
  sock: WASocket,
  payload: { sessionProfile: SessionStoreProfile; jid: string; text: string }
): Promise<void> => {
  const { sessionProfile } = payload;
  const jid = payload.jid;
  const incomingText = payload.text.trim();

  if (!incomingText) {
    return;
  }

  const intent = detectIntent(incomingText);
  const memory = getConversationMemoryScoped(sessionProfile.sessionId, jid);

  logger.info({ jid, intent, sessionId: sessionProfile.sessionId }, "Procesando mensaje comercial");

  try {
    const catalog = await getCatalogItems();
    const relevantItems = findRelevantCatalogItems(catalog, incomingText);

    const aiReply = await generateSalesReply({
      userMessage: incomingText,
      intent,
      memory,
      sessionName: sessionProfile.sessionId,
      relevantItems,
      totalCatalogItems: catalog.length
    });

    const finalReply = aiReply;

    await respondWithHumanSimulation(sock, jid, finalReply);

    const budgetUsd = extractBudgetUsd(incomingText);
    const matchedProducts = relevantItems.map((item) => item.product).slice(0, 3);

    addConversationTurnScoped(
      sessionProfile.sessionId,
      jid,
      { role: "user", text: incomingText, at: Date.now() },
      intent,
      matchedProducts,
      budgetUsd
    );
    addConversationTurnScoped(
      sessionProfile.sessionId,
      jid,
      { role: "assistant", text: finalReply, at: Date.now() },
      intent,
      matchedProducts,
      budgetUsd
    );

    if (intent === "close") {
      clearConversationMemoryScoped(sessionProfile.sessionId, jid);
      logger.info({ jid, sessionId: sessionProfile.sessionId }, "Conversacion finalizada y memoria limpiada");
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isNetworkError = errorMessage.includes("fetch") || errorMessage.includes("timeout") || errorMessage.includes("abort") || errorMessage.includes("ECONNRESET") || errorMessage.includes("ETIMEDOUT");
    logger.error(
      {
        error,
        errorMessage,
        isNetworkError,
        jid,
        sessionId: sessionProfile.sessionId
      },
      isNetworkError
        ? "Error de red al consultar catalogo — enviando mensaje de error al cliente"
        : "Fallo inesperado en flujo comercial — enviando mensaje de error al cliente"
    );
    await respondWithHumanSimulation(
      sock,
      jid,
      "Hubo un problema consultando el catalogo en este momento. Si quieres, te paso con un agente de inmediato."
    );
  }
};

export const getIncomingMessageText = extractTextFromMessage;

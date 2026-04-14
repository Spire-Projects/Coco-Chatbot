import { logger } from "../../core/logger.js";
import { sendTextMessage, markMessageAsRead } from "../../core/whatsapp/sender.js";
import { getCatalogItems, findRelevantCatalogItems } from "./catalog.js";
import { generateReply } from "./gemini.js";
import { detectIntent } from "./intent.js";
import {
  addConversationTurnScoped,
  getConversationMemoryScoped
} from "./memory.js";

const MAIN_SESSION = "main";

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const calculateDelay = (textLength: number): number => {
  const base = Math.min(Math.max(textLength * 25, 1200), 5000);
  const jitter = Math.random() * 600 - 300;
  return Math.round(base + jitter);
};

export const handleIncomingMessage = async (payload: {
  from: string;
  text: string;
  messageId: string;
}): Promise<void> => {
  const { from, text, messageId } = payload;
  const incomingText = text.trim();

  if (!incomingText) {
    return;
  }

  // Marcar como leido (muestra ticks azules)
  await markMessageAsRead(messageId);

  const intent = detectIntent(incomingText);
  const memory = getConversationMemoryScoped(MAIN_SESSION, from);

  logger.info({ from, intent }, "Procesando mensaje");

  try {
    const catalog = await getCatalogItems();
    const relevantItems = findRelevantCatalogItems(catalog, incomingText);

    const reply = await generateReply({
      userMessage: incomingText,
      intent,
      memory,
      sessionName: MAIN_SESSION,
      relevantItems,
      totalCatalogItems: catalog.length
    });

    // Delay natural antes de responder
    await sleep(calculateDelay(reply.length));

    await sendTextMessage(from, reply);

    addConversationTurnScoped(MAIN_SESSION, from, { role: "user", text: incomingText, at: Date.now() }, intent, []);
    addConversationTurnScoped(MAIN_SESSION, from, { role: "assistant", text: reply, at: Date.now() }, intent, []);
  } catch (error) {
    logger.error({ error, from }, "Error al procesar mensaje");
    await sendTextMessage(from, "Disculpa, tuve un problema al procesar tu consulta. Por favor intenta nuevamente.");
  }
};


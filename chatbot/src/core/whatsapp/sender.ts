import { env } from "../../config/env.js";
import { logger } from "../logger.js";

const META_API_BASE = "https://graph.facebook.com";

export const sendTextMessage = async (to: string, text: string): Promise<void> => {
  if (!env.META_ACCESS_TOKEN || !env.META_PHONE_NUMBER_ID) {
    logger.error("META_ACCESS_TOKEN o META_PHONE_NUMBER_ID no configurados");
    return;
  }

  const url = `${META_API_BASE}/${env.META_API_VERSION}/${env.META_PHONE_NUMBER_ID}/messages`;

  const body = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { preview_url: false, body: text }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.META_ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    logger.error({ status: response.status, body: errorBody, to }, "Error al enviar mensaje por Meta API");
    throw new Error(`Meta API error ${response.status}: ${errorBody}`);
  }

  logger.debug({ to }, "Mensaje enviado correctamente via Meta API");
};

export const markMessageAsRead = async (messageId: string): Promise<void> => {
  if (!messageId || !env.META_ACCESS_TOKEN || !env.META_PHONE_NUMBER_ID) {
    return;
  }

  const url = `${META_API_BASE}/${env.META_API_VERSION}/${env.META_PHONE_NUMBER_ID}/messages`;

  const body = {
    messaging_product: "whatsapp",
    status: "read",
    message_id: messageId
  };

  try {
    await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.META_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
  } catch (error) {
    logger.warn({ error, messageId }, "No se pudo marcar mensaje como leido");
  }
};

import { Router } from "express";
import { env } from "../../config/env.js";
import { logger } from "../logger.js";
import { handleIncomingMessage } from "../../features/sales-assistant/handler.js";

export const createWhatsAppWebhookRouter = (): Router => {
  const router = Router();

  // Verificacion del webhook (Meta llama GET al configurarlo)
  router.get("/", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === env.META_WEBHOOK_VERIFY_TOKEN) {
      logger.info("Webhook de Meta verificado correctamente");
      res.status(200).send(challenge);
      return;
    }

    logger.warn({ mode, providedToken: token }, "Verificacion de webhook fallida — token incorrecto");
    res.status(403).json({ error: "Forbidden" });
  });

  // Mensajes entrantes de WhatsApp (Meta hace POST aqui)
  router.post("/", (req, res) => {
    // Responder 200 de inmediato para que Meta no reintente
    res.status(200).json({ status: "ok" });

    const payload = req.body;

    if (payload?.object !== "whatsapp_business_account") {
      return;
    }

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== "messages") {
          continue;
        }

        const value = change.value;
        const messages: unknown[] = value?.messages ?? [];

        for (const msg of messages) {
          const m = msg as Record<string, unknown>;

          // Solo procesar mensajes de texto entrantes
          if (m.type !== "text") {
            continue;
          }

          const from = String(m.from ?? "");
          const text = String((m.text as Record<string, unknown>)?.body ?? "");
          const messageId = String(m.id ?? "");

          if (!from || !text) {
            continue;
          }

          logger.info({ from, messageId }, "Mensaje entrante de WhatsApp recibido");

          handleIncomingMessage({ from, text, messageId }).catch((error) => {
            logger.error({ error, from }, "Error al procesar mensaje entrante");
          });
        }
      }
    }
  });

  return router;
};

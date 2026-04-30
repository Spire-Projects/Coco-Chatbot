import { env } from "../../../config/env.js";
import { logger } from "../../logger.js";
import type { ConnectionState, IWhatsAppTransport, IncomingMessageHandler } from "../transport.js";

const META_API_BASE = "https://graph.facebook.com";

/**
 * Transporte Meta WhatsApp Business Cloud API.
 *
 * Los mensajes entrantes llegan por webhook HTTP (ver webhook.ts).
 * Este transport solo gestiona el envío saliente y el marcado de leídos.
 */
export class MetaTransport implements IWhatsAppTransport {
  async connect(_onMessage: IncomingMessageHandler): Promise<void> {
    // Meta no usa socket activo — los mensajes entran por el webhook Express.
    logger.info("Transporte Meta listo. Esperando mensajes via webhook HTTP.");
  }

  async disconnect(): Promise<void> {
    // No hay socket que cerrar
  }

  async sendTextMessage(to: string, text: string): Promise<void> {
    if (!env.META_ACCESS_TOKEN || !env.META_PHONE_NUMBER_ID) {
      logger.error("META_ACCESS_TOKEN o META_PHONE_NUMBER_ID no configurados");
      return;
    }

    const url = `${META_API_BASE}/${env.META_API_VERSION}/${env.META_PHONE_NUMBER_ID}/messages`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.META_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { preview_url: false, body: text }
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Meta API error ${response.status}: ${err}`);
    }

    logger.debug({ to }, "Mensaje enviado via Meta API");
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    if (!messageId || !env.META_ACCESS_TOKEN || !env.META_PHONE_NUMBER_ID) return;

    const url = `${META_API_BASE}/${env.META_API_VERSION}/${env.META_PHONE_NUMBER_ID}/messages`;

    // Marcar leído no es crítico — se ignoran errores
    await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.META_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId
      })
    }).catch(() => undefined);
  }

  getConnectionState(): ConnectionState {
    return { status: "connected", qrRaw: null };
  }

  onConnectionStateChange(_cb: (state: ConnectionState) => void): () => void {
    return () => undefined;
  }
}

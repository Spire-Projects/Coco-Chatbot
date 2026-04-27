import "dotenv/config";
import type { Server } from "node:http";
import { env } from "./config/env.js";
import { logger } from "./core/logger.js";
import { initializePromptStore } from "./features/prompts/service.js";
import { startPromptApiServer } from "./features/prompts/server.js";
import { getTotalCount } from "./features/sales-assistant/catalog.js";
import { handleIncomingMessage } from "./features/sales-assistant/handler.js";
import { BaileysTransport } from "./core/whatsapp/transports/baileys.js";
import { MetaTransport } from "./core/whatsapp/transports/meta.js";
import type { IWhatsAppTransport } from "./core/whatsapp/transport.js";

let promptApiServer: Server | null = null;
let transport: IWhatsAppTransport | null = null;

const shutdown = async (signal: string) => {
  logger.warn({ signal }, "Apagando bot...");

  await transport?.disconnect();

  if (promptApiServer) {
    promptApiServer.close(() => process.exit(0));
    return;
  }

  process.exit(0);
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

const bootstrap = async () => {
  await initializePromptStore();

  // Seleccionar transporte según la variable de entorno
  transport =
    env.WHATSAPP_PROVIDER === "meta"
      ? new MetaTransport()
      : new BaileysTransport();

  logger.info({ provider: env.WHATSAPP_PROVIDER }, "Iniciando transporte de WhatsApp");

  // Iniciar servidor HTTP (necesario para el webhook Meta y el panel /admin)
  promptApiServer = startPromptApiServer(transport);

  // Verificar conectividad con el sheet y cachear el total de empresas
  getTotalCount()
    .then((count) => logger.info({ count }, "Directorio listo — total empresas en sheet"))
    .catch((err) => logger.warn({ error: String(err) }, "No se pudo verificar el directorio"));

  // Conectar el transporte — en Baileys muestra el QR; en Meta no hace nada
  await transport.connect(async (msg) => {
    await handleIncomingMessage(msg, transport!);
  });
};

bootstrap().catch((error) => {
  logger.error({ error }, "Fallo al iniciar la aplicacion");
  process.exit(1);
});


import "dotenv/config";
import type { Server } from "node:http";
import { startWhatsAppClients } from "./core/whatsapp/client.js";
import { logger } from "./core/logger.js";
import { initializePromptStore } from "./features/prompts/service.js";
import { startPromptApiServer } from "./features/prompts/server.js";

let promptApiServer: Server | null = null;

const shutdown = (signal: string) => {
  logger.warn({ signal }, "Apagando bot...");

  if (promptApiServer) {
    promptApiServer.close((error) => {
      if (error) {
        logger.error({ error }, "Error cerrando API de prompts");
      }
      process.exit(0);
    });
    return;
  }

  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

const bootstrap = async () => {
  await initializePromptStore();
  promptApiServer = startPromptApiServer();
  await startWhatsAppClients();
};

bootstrap().catch((error) => {
  logger.error({ error }, "Fallo al iniciar la aplicacion");
  process.exit(1);
});

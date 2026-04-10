import express from "express";
import type { Server } from "node:http";
import { env } from "../../config/env.js";
import { logger } from "../../core/logger.js";
import { createPromptRouter } from "./routes.js";
import { createSessionRouter } from "../sessions/routes.js";

export const startPromptApiServer = (): Server => {
  const app = express();

  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS");

    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    next();
  });

  app.use(express.json({ limit: "64kb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/prompts", createPromptRouter());
  app.use("/api/sessions", createSessionRouter());

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : "Error no controlado";
    logger.warn({ error: message }, "Error en API de prompts");
    res.status(400).json({ error: message });
  });

  const server = app.listen(env.API_PORT, () => {
    logger.info({ port: env.API_PORT }, "API de prompts iniciada");
  });

  return server;
};

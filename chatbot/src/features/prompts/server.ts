import express from "express";
import type { Server } from "node:http";
import { env } from "../../config/env.js";
import { logger } from "../../core/logger.js";
import { createPromptRouter } from "./routes.js";
import { createWhatsAppWebhookRouter } from "../../core/whatsapp/webhook.js";

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

  // Webhook de Meta WhatsApp
  app.use("/webhook", createWhatsAppWebhookRouter());

  // API de prompts
  app.use("/api/prompts", createPromptRouter());

  // Panel de administracion HTML (editor de prompt)
  app.get("/admin", (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(buildAdminHtml());
  });

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : "Error no controlado";
    logger.warn({ error: message }, "Error en API");
    res.status(400).json({ error: message });
  });

  const server = app.listen(env.API_PORT, () => {
    logger.info({ port: env.API_PORT }, `Servidor iniciado en puerto ${env.API_PORT}`);
    logger.info(`Admin panel: http://localhost:${env.API_PORT}/admin`);
    logger.info(`Webhook URL: http://localhost:${env.API_PORT}/webhook`);
  });

  return server;
};

const buildAdminHtml = (): string => `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Coco Chatbot — Editor de Prompt</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #f0f2f5; padding: 2rem; color: #1a1a1a; }
    h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
    .subtitle { color: #666; font-size: 0.9rem; margin-bottom: 2rem; }
    .card { background: white; border-radius: 10px; padding: 1.5rem; box-shadow: 0 1px 4px rgba(0,0,0,.1); }
    h2 { font-size: 1rem; font-weight: 600; margin-bottom: 0.75rem; color: #333; }
    .hint { font-size: 0.8rem; color: #888; margin-bottom: 0.75rem; }
    textarea {
      width: 100%; min-height: 180px; padding: 0.75rem;
      border: 1px solid #ddd; border-radius: 6px;
      font-size: 0.9rem; font-family: inherit; resize: vertical; line-height: 1.5;
    }
    textarea:focus { outline: none; border-color: #0d6efd; box-shadow: 0 0 0 3px rgba(13,110,253,.15); }
    .actions { display: flex; align-items: center; gap: 1rem; margin-top: 0.75rem; }
    button {
      padding: 0.55rem 1.25rem; background: #0d6efd; color: white;
      border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem; font-weight: 500;
    }
    button:hover { background: #0b5ed7; }
    button:disabled { background: #aaa; cursor: not-allowed; }
    .msg { font-size: 0.85rem; }
    .ok { color: #198754; }
    .err { color: #dc3545; }
  </style>
</head>
<body>
  <h1>Coco Chatbot</h1>
  <p class="subtitle">Editor de Prompt del asistente</p>

  <div class="card">
    <h2>Prompt Base del Chatbot</h2>
    <p class="hint">Este texto define el comportamiento del asistente. Se combina automaticamente con el catalogo de empresas al responder.</p>
    <textarea id="globalPrompt" placeholder="Cargando..."></textarea>
    <div class="actions">
      <button id="saveBtn" onclick="saveGlobal()">Guardar cambios</button>
      <span class="msg" id="globalMsg"></span>
    </div>
  </div>

  <script>
    const base = '/api/prompts';

    async function load() {
      try {
        const r = await fetch(base + '/global');
        const d = await r.json();
        document.getElementById('globalPrompt').value = d.content ?? '';
      } catch (e) {
        showMsg('globalMsg', 'Error al cargar: ' + e.message, false);
      }
    }

    async function saveGlobal() {
      const content = document.getElementById('globalPrompt').value;
      const btn = document.getElementById('saveBtn');
      btn.disabled = true;
      btn.textContent = 'Guardando...';
      try {
        const r = await fetch(base + '/global', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? 'Error');
        showMsg('globalMsg', 'Guardado correctamente', true);
      } catch (e) {
        showMsg('globalMsg', 'Error: ' + e.message, false);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Guardar cambios';
      }
    }

    function showMsg(id, text, ok) {
      const el = document.getElementById(id);
      el.textContent = text;
      el.className = 'msg ' + (ok ? 'ok' : 'err');
      setTimeout(() => { el.textContent = ''; }, 4000);
    }

    load();
  </script>
</body>
</html>`;


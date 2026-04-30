import express from "express";
import type { Server } from "node:http";
import { env } from "../../config/env.js";
import { logger } from "../../core/logger.js";
import { createPromptRouter } from "./routes.js";
import { createChatsRouter } from "../chats/routes.js";
import { createWhatsAppWebhookRouter } from "../../core/whatsapp/webhook.js";
import { searchCatalog, getTotalCount } from "../sales-assistant/catalog.js";
import { generateReply } from "../sales-assistant/gemini.js";
import { detectIntent } from "../sales-assistant/intent.js";
import { addConversationTurnScoped, getConversationMemoryScoped } from "../sales-assistant/memory.js";
import type { IWhatsAppTransport } from "../../core/whatsapp/transport.js";

export const startPromptApiServer = (transport: IWhatsAppTransport): Server => {
  const app = express();

  // Clientes SSE suscritos al estado de conexión
  const sseClients = new Set<express.Response>();

  // Propagamos cambios de estado a todos los clientes SSE conectados
  const unsubscribeState = transport.onConnectionStateChange((state) => {
    const data = JSON.stringify(state);
    for (const res of sseClients) {
      res.write(`data: ${data}\n\n`);
    }
  });

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
  app.use("/webhook", createWhatsAppWebhookRouter(transport));

  // API de prompts
  app.use("/api/prompts", createPromptRouter());

  // API de chats / conversaciones
  app.use("/api/chats", createChatsRouter());

  // Estado de conexión WhatsApp (snapshot)
  app.get("/api/status", (_req, res) => {
    res.json(transport.getConnectionState());
  });

  // Estado de conexión WhatsApp (tiempo real via SSE)
  app.get("/api/status/events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    // Enviar estado actual al conectarse
    res.write(`data: ${JSON.stringify(transport.getConnectionState())}\n\n`);

    sseClients.add(res);
    req.on("close", () => sseClients.delete(res));
  });

  // Endpoint de prueba HTTP — simula mensajes sin necesitar WhatsApp conectado
  app.post("/test", async (req, res) => {
    try {
      const text: string = typeof req.body?.text === "string" ? req.body.text.trim() : "hola";
      const from: string = typeof req.body?.from === "string" ? req.body.from : "test_user";

      if (!text) {
        res.status(400).json({ error: "Campo 'text' requerido" });
        return;
      }

      const intent = detectIntent(text);
      const memory = getConversationMemoryScoped("main", from);
      // Extraer términos del mensaje de prueba para búsqueda contextual
      const words = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/\s+/).filter((w) => w.length >= 3);
      const [relevantItems, totalCatalogItems] = await Promise.all([
        searchCatalog(words, [], 15),
        getTotalCount(),
      ]);

      const reply = await generateReply({
        userMessage: text,
        intent,
        memory,
        sessionName: "main",
        relevantItems,
        totalCatalogItems,
        matchingCount: relevantItems.length,
      });

      addConversationTurnScoped("main", from, { role: "user", text, at: Date.now() }, intent, []);
      addConversationTurnScoped("main", from, { role: "assistant", text: reply, at: Date.now() }, intent, []);

      res.json({ reply, catalogItems: totalCatalogItems, relevantItems: relevantItems.length, intent });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ error: message }, "Error en /test");
      res.status(500).json({ error: message });
    }
  });

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

  server.on("close", unsubscribeState);

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

  <div class="card" style="margin-top: 1.5rem;">
    <h2>Probar el Chatbot</h2>
    <p class="hint">Simula conversaciones sin WhatsApp ni credenciales Meta. El historial se mantiene por sesion para probar contexto.</p>
    <div id="chatHistory" style="border:1px solid #ddd;border-radius:6px;padding:0.75rem;height:320px;overflow-y:auto;background:#f8f9fa;display:flex;flex-direction:column;gap:0.6rem;margin-bottom:0.75rem;"></div>
    <div style="display:flex;gap:0.5rem;">
      <input id="testInput" type="text" placeholder="Escribe un mensaje de prueba..." style="flex:1;padding:0.55rem 0.75rem;border:1px solid #ddd;border-radius:6px;font-size:0.9rem;font-family:inherit;">
      <button id="testBtn" onclick="sendTest()">Enviar</button>
    </div>
    <div style="display:flex;gap:1rem;align-items:center;margin-top:0.5rem;">
      <span class="msg" id="testStats" style="flex:1;"></span>
      <button onclick="clearChat()" style="background:#6c757d;font-size:0.8rem;padding:0.35rem 0.75rem;">Limpiar chat</button>
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

    // ── Chat de prueba ────────────────────────────────────────────
    let sessionId = 'demo_' + Math.random().toString(36).slice(2, 8);

    function appendMessage(role, text) {
      const chat = document.getElementById('chatHistory');
      const wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex;flex-direction:column;align-items:' + (role === 'user' ? 'flex-end' : 'flex-start') + ';';
      const bubble = document.createElement('div');
      bubble.style.cssText = role === 'user'
        ? 'background:#0d6efd;color:white;padding:0.5rem 0.75rem;border-radius:12px 12px 2px 12px;max-width:78%;font-size:0.9rem;white-space:pre-wrap;word-break:break-word;'
        : 'background:white;border:1px solid #ddd;padding:0.5rem 0.75rem;border-radius:12px 12px 12px 2px;max-width:78%;font-size:0.9rem;white-space:pre-wrap;word-break:break-word;';
      bubble.textContent = text;
      wrap.appendChild(bubble);
      chat.appendChild(wrap);
      chat.scrollTop = chat.scrollHeight;
    }

    async function sendTest() {
      const input = document.getElementById('testInput');
      const text = input.value.trim();
      if (!text) return;
      const btn = document.getElementById('testBtn');
      btn.disabled = true;
      input.value = '';
      appendMessage('user', text);
      const chat = document.getElementById('chatHistory');
      const typing = document.createElement('div');
      typing.id = 'typing-indicator';
      typing.style.cssText = 'color:#888;font-size:0.85rem;font-style:italic;padding:0.25rem 0.5rem;';
      typing.textContent = 'Escribiendo...';
      chat.appendChild(typing);
      chat.scrollTop = chat.scrollHeight;
      try {
        const r = await fetch('/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, from: sessionId })
        });
        const d = await r.json();
        document.getElementById('typing-indicator')?.remove();
        if (!r.ok) throw new Error(d.error ?? 'Error');
        appendMessage('bot', d.reply);
        const stats = document.getElementById('testStats');
        stats.textContent = 'Catalogo: ' + d.catalogItems + ' empresas | Relevantes: ' + d.relevantItems;
        stats.className = 'msg ok';
      } catch (e) {
        document.getElementById('typing-indicator')?.remove();
        showMsg('testStats', 'Error: ' + e.message, false);
      } finally {
        btn.disabled = false;
        input.focus();
      }
    }

    function clearChat() {
      document.getElementById('chatHistory').innerHTML = '';
      document.getElementById('testStats').textContent = '';
      sessionId = 'demo_' + Math.random().toString(36).slice(2, 8);
    }

    document.getElementById('testInput').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') sendTest();
    });
  </script>
</body>
</html>`;


import { promises as fs } from "fs";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  type WAMessageKey
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import qrcodeTerminal from "qrcode-terminal";
import pino from "pino";
import { logger } from "../../logger.js";
import type { IWhatsAppTransport, IncomingMessageHandler } from "../transport.js";

// Carpeta donde Baileys guarda las credenciales de sesión
const AUTH_FOLDER = "./baileys_auth";

// Logger silencioso para los mensajes internos de Baileys
const baileysInternalLogger = pino({ level: "silent" });

export class BaileysTransport implements IWhatsAppTransport {
  private socket: ReturnType<typeof makeWASocket> | null = null;
  private handler: IncomingMessageHandler | null = null;

  // Mapa messageId → WAMessageKey para poder marcar mensajes como leídos
  private messageKeys = new Map<string, WAMessageKey>();

  async connect(onMessage: IncomingMessageHandler): Promise<void> {
    this.handler = onMessage;
    await this.createSocket();
  }

  private async createSocket(): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

    let version: [number, number, number];
    try {
      const result = await fetchLatestBaileysVersion();
      version = result.version;
      logger.debug({ version }, "Version de WhatsApp Web obtenida");
    } catch {
      // Fallback a una versión conocida si no hay red para consultar
      version = [2, 3000, 1015901307];
      logger.warn("No se pudo obtener la version de WA Web, usando fallback");
    }

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false, // Gestionamos el QR manualmente
      logger: baileysInternalLogger,
      browser: ["Coco Chatbot", "Chrome", "1.0.0"]
    });

    // ── Eventos de conexión ──────────────────────────────────────────────────

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        // Limpia la consola y muestra el QR de forma destacada
        console.clear();
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("  COCO CHATBOT — Conectar WhatsApp");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log();
        qrcodeTerminal.generate(qr, { small: true });
        console.log();
        console.log("  Abre WhatsApp → Dispositivos vinculados → Vincular dispositivo");
        console.log("  El QR se regenera automáticamente si expira.");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log();
      }

      if (connection === "close") {
        const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;

        if (reason === DisconnectReason.loggedOut) {
          // El usuario cerró la sesión desde su teléfono → limpiar auth y generar nuevo QR
          logger.warn("Sesion cerrada por el usuario (logout). Limpiando credenciales y generando nuevo QR...");
          try {
            await fs.rm(AUTH_FOLDER, { recursive: true, force: true });
            logger.info("Credenciales eliminadas — se mostrará un nuevo QR");
          } catch (e) {
            logger.warn({ e }, "No se pudo limpiar la carpeta de auth");
          }
          await new Promise((r) => setTimeout(r, 2000));
          await this.createSocket();
        } else {
          // Cualquier otro cierre (red, timeout, etc.) → reconectar directamente
          logger.warn({ reason }, "Conexion cerrada — reconectando...");
          await new Promise((r) => setTimeout(r, 3000));
          await this.createSocket();
        }
      }

      if (connection === "open") {
        console.clear();
        logger.info("WhatsApp conectado — el chatbot esta listo");
      }
    });

    // ── Persistir credenciales cuando cambien ───────────────────────────────

    sock.ev.on("creds.update", saveCreds);

    // ── Mensajes entrantes ──────────────────────────────────────────────────

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      // "notify" = mensaje nuevo; "append" = historial paginado (ignorar)
      if (type !== "notify") return;

      for (const msg of messages) {
        // Ignorar mensajes propios y mensajes sin contenido
        if (msg.key.fromMe || !msg.message) continue;

        const from = msg.key.remoteJid;
        if (!from) continue;

        // Ignorar mensajes de grupos (los JIDs de grupos terminan en @g.us)
        if (from.endsWith("@g.us")) continue;

        // Extraer texto de los tipos de mensaje más comunes
        const text =
          msg.message.conversation ??
          msg.message.extendedTextMessage?.text ??
          "";

        if (!text.trim()) continue;

        const messageId = msg.key.id ?? "";

        // Guardar la key completa para poder marcar como leído después
        if (messageId) {
          this.messageKeys.set(messageId, msg.key);
        }

        logger.info({ from }, "Mensaje entrante (Baileys)");

        this.handler?.({ from, text, messageId }).catch((err: unknown) => {
          logger.error({ err, from }, "Error procesando mensaje entrante");
        });
      }
    });

    this.socket = sock;
  }

  // ── Implementación de IWhatsAppTransport ──────────────────────────────────

  async sendTextMessage(to: string, text: string): Promise<void> {
    if (!this.socket) {
      throw new Error("WhatsApp no esta conectado");
    }
    await this.socket.sendMessage(to, { text });
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    if (!this.socket || !messageId) return;

    const key = this.messageKeys.get(messageId);
    if (!key) return;

    await this.socket.readMessages([key]);
    this.messageKeys.delete(messageId);
  }

  async disconnect(): Promise<void> {
    this.socket?.end(undefined);
    this.socket = null;
    this.messageKeys.clear();
    logger.info("BaileysTransport desconectado");
  }
}

/**
 * Persistencia de conversaciones en Turso (SQLite).
 *
 * Tablas:
 *   chats    — un registro por número de teléfono (cliente)
 *   messages — historial de turnos (usuario / asistente), FK → chats
 *
 * El diseño es "upsert-safe": si el chat ya existe solo actualiza
 * last_message_at; los mensajes siempre se insertan como filas nuevas.
 */

import { getPromptDb } from "../prompts/store.js";
import { logger } from "../../core/logger.js";

// ── Schema ────────────────────────────────────────────────────────────────────

const SCHEMA_CHATS = `
  CREATE TABLE IF NOT EXISTS chats (
    phone        TEXT PRIMARY KEY,
    contact_name TEXT,
    first_seen   TEXT NOT NULL,
    last_message_at TEXT NOT NULL
  )
`;

const SCHEMA_MESSAGES = `
  CREATE TABLE IF NOT EXISTS messages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    phone           TEXT NOT NULL,
    user_message    TEXT NOT NULL,
    bot_reply       TEXT NOT NULL,
    intent          TEXT NOT NULL DEFAULT '',
    sent_at         TEXT NOT NULL,
    FOREIGN KEY (phone) REFERENCES chats(phone)
  )
`;

let schemaReady = false;

const ensureSchema = async (): Promise<void> => {
  if (schemaReady) return;
  const db = await getPromptDb();
  await db.execute(SCHEMA_CHATS);
  await db.execute(SCHEMA_MESSAGES);
  schemaReady = true;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Normaliza un JID de Baileys (o número Meta) a solo dígitos + posible '+'.
 * Ejemplos:
 *   "5959112345678@s.whatsapp.net" → "5959112345678"
 *   "+591 71234567"                → "+59171234567"
 *   "59171234567"                  → "59171234567"
 */
export const normalizePhone = (jid: string): string => {
  // Eliminar parte @dominio de Baileys
  const withoutDomain = jid.split("@")[0];
  // Conservar solo dígitos (y '+' inicial si existía)
  const hasPlus = withoutDomain.startsWith("+");
  const digits = withoutDomain.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
};

// ── Public API ────────────────────────────────────────────────────────────────

export interface SaveTurnOptions {
  /** JID completo de Baileys o número de teléfono */
  phone: string;
  /** Nombre de contacto si está disponible (puede ser undefined) */
  contactName?: string;
  /** Mensaje que envió el usuario */
  userMessage: string;
  /** Respuesta generada por el bot */
  botReply: string;
  /** Intención detectada */
  intent: string;
}

/**
 * Persiste un turno de conversación (mensaje del usuario + respuesta del bot)
 * en la base de datos Turso. Fire-and-forget: los errores se loguean y no
 * interrumpen el flujo principal del bot.
 */
// ── Query types ───────────────────────────────────────────────────────────────

export interface ChatRow {
  phone: string;
  contactName: string | null;
  firstSeen: string;
  lastMessageAt: string;
}

export interface MessageRow {
  id: number;
  phone: string;
  userMessage: string;
  botReply: string;
  intent: string;
  sentAt: string;
}

export interface ChatsPage {
  chats: ChatRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface MessagesPage {
  messages: MessageRow[];
  total: number;
  limit: number;
  offset: number;
}

// ── Query API ─────────────────────────────────────────────────────────────────

/** Lista chats ordenados por último mensaje, con paginación. */
export const listChats = async (limit = 30, offset = 0): Promise<ChatsPage> => {
  await ensureSchema();
  const db = await getPromptDb();

  const [rows, count] = await Promise.all([
    db.execute({
      sql: `SELECT phone, contact_name, first_seen, last_message_at
            FROM chats
            ORDER BY last_message_at DESC
            LIMIT ? OFFSET ?`,
      args: [limit, offset],
    }),
    db.execute({ sql: `SELECT COUNT(*) AS total FROM chats`, args: [] }),
  ]);

  const chats: ChatRow[] = rows.rows.map((r) => ({
    phone: String(r.phone ?? ""),
    contactName: r.contact_name != null ? String(r.contact_name) : null,
    firstSeen: String(r.first_seen ?? ""),
    lastMessageAt: String(r.last_message_at ?? ""),
  }));

  const total = Number(count.rows[0]?.total ?? 0);
  return { chats, total, limit, offset };
};

/**
 * Mensajes de un chat ordenados del más reciente al más antiguo, con paginación.
 * El cursor es por offset — útil para lazy loading.
 */
export const listMessages = async (phone: string, limit = 20, offset = 0): Promise<MessagesPage> => {
  await ensureSchema();
  const db = await getPromptDb();

  const normalized = normalizePhone(phone);

  const [rows, count] = await Promise.all([
    db.execute({
      sql: `SELECT id, phone, user_message, bot_reply, intent, sent_at
            FROM messages
            WHERE phone = ?
            ORDER BY id DESC
            LIMIT ? OFFSET ?`,
      args: [normalized, limit, offset],
    }),
    db.execute({
      sql: `SELECT COUNT(*) AS total FROM messages WHERE phone = ?`,
      args: [normalized],
    }),
  ]);

  const messages: MessageRow[] = rows.rows.map((r) => ({
    id: Number(r.id ?? 0),
    phone: String(r.phone ?? ""),
    userMessage: String(r.user_message ?? ""),
    botReply: String(r.bot_reply ?? ""),
    intent: String(r.intent ?? ""),
    sentAt: String(r.sent_at ?? ""),
  }));

  const total = Number(count.rows[0]?.total ?? 0);
  return { messages, total, limit, offset };
};

// ── Write API ─────────────────────────────────────────────────────────────────

export const saveChatTurn = async (opts: SaveTurnOptions): Promise<void> => {
  try {
    await ensureSchema();
    const db = await getPromptDb();

    const phone = normalizePhone(opts.phone);
    const now = new Date().toISOString();

    // Upsert del registro de chat (cliente)
    await db.execute({
      sql: `
        INSERT INTO chats (phone, contact_name, first_seen, last_message_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(phone)
        DO UPDATE SET
          contact_name    = COALESCE(excluded.contact_name, contact_name),
          last_message_at = excluded.last_message_at
      `,
      args: [phone, opts.contactName ?? null, now, now],
    });

    // Insertar el turno (mensaje + respuesta)
    await db.execute({
      sql: `
        INSERT INTO messages (phone, user_message, bot_reply, intent, sent_at)
        VALUES (?, ?, ?, ?, ?)
      `,
      args: [phone, opts.userMessage, opts.botReply, opts.intent, now],
    });
  } catch (error) {
    logger.error({ error, phone: opts.phone }, "No se pudo persistir turno de conversacion");
  }
};

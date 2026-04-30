import { logger } from "../../core/logger.js";
import type { IWhatsAppTransport } from "../../core/whatsapp/transport.js";
import { searchCatalog, getTotalCount } from "./catalog.js";
import { generateReply } from "./gemini.js";
import { detectIntent } from "./intent.js";
import {
  addConversationTurnScoped,
  getConversationMemoryScoped
} from "./memory.js";
import { saveChatTurn } from "../chats/store.js";

const MAIN_SESSION = "main";

// ── Message debounce buffer ───────────────────────────────────────────────────
// Agrupa mensajes rápidos del mismo usuario (WhatsApp suele fragmentar mensajes)
// Espera DEBOUNCE_MS sin actividad antes de procesar el bloque completo.
const DEBOUNCE_MS = 2500;

interface PendingBuffer {
  messages: string[];
  timer: ReturnType<typeof setTimeout>;
}

const pendingBuffers = new Map<string, PendingBuffer>();

/** Departamentos de Bolivia para detectar ubicación en el mensaje */
const BOLIVIA_DEPARTMENTS = [
  "la paz", "santa cruz", "cochabamba", "oruro", "potosi",
  "tarija", "beni", "pando", "chuquisaca", "sucre", "trinidad",
];

/**
 * Mapa de sinónimos, abreviaciones y errores tipográficos comunes
 * de departamentos bolivianos → nombre normalizado del departamento.
 */
const DEPT_SYNONYMS: Record<string, string> = {
  // Cochabamba
  "cocha":        "cochabamba",
  "cbba":         "cochabamba",
  "cbba.": "cochabamba",
  "cochbamba":    "cochabamba",
  "cochambamba":  "cochabamba",
  "cochabamaba":  "cochabamba",
  // Santa Cruz
  "scz":          "santa cruz",
  "santacruz":    "santa cruz",
  "sta cruz":     "santa cruz",
  "sta. cruz":    "santa cruz",
  "satna cruz":   "santa cruz",
  // La Paz
  "lpz":          "la paz",
  "lapaz":        "la paz",
  "la pz":        "la paz",
  // Tarija
  "tasrija":      "tarija",
  "tairja":       "tarija",
  "tarija":       "tarija",
  // Oruro
  "ouro":         "oruro",
  // Potosí
  "potosi":       "potosi",
  "ptosi":        "potosi",
  // Beni
  "benii":        "beni",
  // Pando
  "pandoo":       "pando",
  // Chuquisaca / Sucre
  "chuqui":       "chuquisaca",
  "chiqui":       "chuquisaca",
  "chuquizaca":   "chuquisaca",
  "chuquishaca":  "chuquisaca",
  "sucre":        "chuquisaca",
  // Trinidad (Beni)
  "trini":        "beni",
  "trinidad":     "beni",
};

/** Palabras vacías que no aportan al rubro buscado */
const STOP_WORDS = new Set([
  "busco", "quiero", "necesito", "hay", "tiene", "tienen",
  "en", "de", "del", "la", "el", "los", "las", "un", "una",
  "para", "por", "con", "que", "como", "donde", "cual", "cuales",
  "me", "te", "se", "si", "no", "es", "son", "esta", "estan",
  "dame", "dime", "puedes", "mostrar", "ver", "listar", "lista",
  "encontrar", "buscar", "empresa", "empresas", "negocio", "negocios",
  "mas", "todo", "todos", "o", "y", "a", "e", "al",
  // Saludos y palabras de tiempo que no son rubros
  "hola", "buenas", "buenos", "buen", "dias", "tardes", "noches",
  "noche", "dia", "tarde", "mañana", "manana", "hey", "holi",
  "gracias", "ok", "okay", "oki", "sip", "claro", "perfecto",
  "ayuda", "ayudame", "informacion", "info",
  "mi", "mis", "tu", "sus", "su", "nuestro",
  "quieres", "quiero", "quisiera", "podrias", "podria",
  "favor", "porfavor", "por",
]);

const normalizeSimple = (text: string): string =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Detecta si el mensaje menciona un departamento boliviano (incluyendo sinónimos y typos). */
const detectDepartment = (text: string): string | null => {
  const normalized = normalizeSimple(text);

  // 1. Buscar coincidencia directa con departamentos
  const direct = BOLIVIA_DEPARTMENTS.find((dept) => normalized.includes(dept));
  if (direct) return direct;

  // 2. Revisar cada palabra/token contra el mapa de sinónimos
  const tokens = normalized.split(/\s+/);
  for (const token of tokens) {
    if (DEPT_SYNONYMS[token]) return DEPT_SYNONYMS[token];
  }

  // 3. Coincidencia parcial aproximada en sinónimos (si un token contiene la clave)
  for (const [key, value] of Object.entries(DEPT_SYNONYMS)) {
    if (normalized.includes(key)) return value;
  }

  return null;
};

/** Extrae palabras de rubro eliminando stop words y palabras de ubicación. */
const extractRubroTerms = (text: string, excludeWords: string[]): string[] => {
  const normalized = normalizeSimple(text);
  const excluded = new Set(excludeWords.map(normalizeSimple));
  return normalized
    .split(/\s+/)
    .filter(
      (w) =>
        w.length >= 3 &&
        !STOP_WORDS.has(w) &&
        !BOLIVIA_DEPARTMENTS.some((d) => d.includes(w) || w.includes(d.split(" ")[0])) &&
        !excluded.has(w)
    )
    .slice(0, 6);
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const calculateDelay = (textLength: number): number => {
  const base = Math.min(Math.max(textLength * 25, 1200), 5000);
  const jitter = Math.random() * 600 - 300;
  return Math.round(base + jitter);
};

/** Procesa un bloque de texto (puede ser la combinación de varios mensajes rápidos). */
const processMessage = async (
  from: string,
  phone: string,
  incomingText: string,
  transport: IWhatsAppTransport
): Promise<void> => {
  const intent = detectIntent(incomingText);
  // La clave de memoria usa el phone real para ser consistente con el almacenamiento
  const memory = getConversationMemoryScoped(MAIN_SESSION, phone);

  // ── Actualizar contexto de memoria ───────────────────────────────────
  const detectedDept = detectDepartment(incomingText);
  if (detectedDept) {
    memory.lastUbicacion = detectedDept;
  }

  // Extraer rubro del mensaje actual (independientemente de la longitud)
  const rubroFromText = extractRubroTerms(incomingText, detectedDept ? [detectedDept] : []);

  // Guardar rubro detectado en memoria para turnos futuros
  if (rubroFromText.length > 0 && !detectedDept) {
    memory.lastRubro = rubroFromText.join(" ");
  } else if (rubroFromText.length > 0 && !memory.lastRubro) {
    // Mensaje mixto (rubro + ubicación): guardar la parte del rubro
    memory.lastRubro = rubroFromText.join(" ");
  }

  // Si el mensaje es corto (<=3 palabras) y sin dept ni stop words, probablemente es solo rubro
  const wordCount = incomingText.trim().split(/\s+/).length;
  if (!detectedDept && wordCount <= 3 && !incomingText.includes("?") && rubroFromText.length === 0) {
    memory.lastRubro = incomingText.trim();
  }

  // ── Construir términos de búsqueda ──────────────────────────────────────
  const locationTerms = memory.lastUbicacion ? [memory.lastUbicacion] : [];

  const rubroFromMemory = memory.lastRubro
    ? normalizeSimple(memory.lastRubro).split(/\s+/).filter((w) => w.length >= 3 && !STOP_WORDS.has(w))
    : [];
  const rubroTerms = [...new Set([...rubroFromMemory, ...rubroFromText])].slice(0, 6);

  logger.info({ from, phone, intent, rubroTerms, locationTerms }, "Procesando mensaje");

  try {
    const [relevantItems, totalCatalogItems] = await Promise.all([
      searchCatalog(rubroTerms, locationTerms, 15),
      getTotalCount(),
    ]);

    const reply = await generateReply({
      userMessage: incomingText,
      intent,
      memory,
      sessionName: MAIN_SESSION,
      relevantItems,
      totalCatalogItems,
      matchingCount: relevantItems.length,
    });

    await sleep(calculateDelay(reply.length));
    await transport.sendTextMessage(from, reply);

    addConversationTurnScoped(MAIN_SESSION, phone, { role: "user", text: incomingText, at: Date.now() }, intent, []);
    addConversationTurnScoped(MAIN_SESSION, phone, { role: "assistant", text: reply, at: Date.now() }, intent, []);

    // Persistir turno en Turso (fire-and-forget)
    void saveChatTurn({
      phone,
      userMessage: incomingText,
      botReply: reply,
      intent,
    });
  } catch (error) {
    logger.error({ error, from, phone }, "Error al procesar mensaje");
    await transport.sendTextMessage(from, "Disculpa, tuve un problema al procesar tu consulta. Por favor intenta nuevamente. 🙏");
  }
};

export const handleIncomingMessage = async (
  payload: { from: string; text: string; messageId: string; phone: string },
  transport: IWhatsAppTransport
): Promise<void> => {
  const { from, phone, text, messageId } = payload;
  const incomingText = text.trim();

  if (!incomingText) {
    return;
  }

  // Marcar como leido (muestra ticks azules)
  await transport.markMessageAsRead(messageId);

  // ── Debounce: agrupar mensajes rápidos del mismo usuario ────────────────
  const existing = pendingBuffers.get(from);
  if (existing) {
    clearTimeout(existing.timer);
    existing.messages.push(incomingText);
    existing.timer = setTimeout(async () => {
      const buffer = pendingBuffers.get(from);
      if (!buffer) return;
      pendingBuffers.delete(from);
      const combined = buffer.messages.join(" ");
      logger.info({ from, phone, messages: buffer.messages.length, combined }, "Procesando bloque de mensajes");
      await processMessage(from, phone, combined, transport);
    }, DEBOUNCE_MS);
  } else {
    const timer = setTimeout(async () => {
      const buffer = pendingBuffers.get(from);
      if (!buffer) return;
      pendingBuffers.delete(from);
      const combined = buffer.messages.join(" ");
      logger.info({ from, phone, messages: buffer.messages.length, combined }, "Procesando bloque de mensajes");
      await processMessage(from, phone, combined, transport);
    }, DEBOUNCE_MS);
    pendingBuffers.set(from, { messages: [incomingText], timer });
  }
};


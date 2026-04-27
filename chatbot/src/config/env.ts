const parseNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseLogLevel = (value: string | undefined, fallback: string): string => {
  const allowed = new Set(["fatal", "error", "warn", "info", "debug", "trace", "silent"]);
  const normalized = (value ?? fallback).trim().toLowerCase();
  return allowed.has(normalized) ? normalized : fallback;
};

export const env = {
  LOG_LEVEL: parseLogLevel(process.env.LOG_LEVEL, "info"),

  // Proveedor de WhatsApp: "baileys" (QR local) | "meta" (Cloud API + webhook)
  WHATSAPP_PROVIDER: (process.env.WHATSAPP_PROVIDER ?? "baileys") as "baileys" | "meta",

  // Meta WhatsApp Cloud API
  META_ACCESS_TOKEN: process.env.META_ACCESS_TOKEN ?? "",
  META_PHONE_NUMBER_ID: process.env.META_PHONE_NUMBER_ID ?? "",
  META_WEBHOOK_VERIFY_TOKEN: process.env.META_WEBHOOK_VERIFY_TOKEN ?? "coco_verify_token",
  META_API_VERSION: process.env.META_API_VERSION ?? "v21.0",

  // Gemini AI
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? "",
  GEMINI_MODEL: process.env.GEMINI_MODEL ?? "gemini-1.5-flash",

  // API Server
  API_PORT: parseNumber(process.env.API_PORT, 3100),

  // Turso DB (almacenamiento de prompts)
  TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL ?? "",
  TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN ?? "",

  // Prompts cache
  PROMPTS_CHAT_CACHE_TTL_SECONDS: parseNumber(process.env.PROMPTS_CHAT_CACHE_TTL_SECONDS, 30),
  PROMPTS_CHAT_CACHE_MAX_MESSAGES: parseNumber(process.env.PROMPTS_CHAT_CACHE_MAX_MESSAGES, 12),

  // Google Sheets (directorio de empresas)
  SHEETS_SPREADSHEET_ID: process.env.SHEETS_SPREADSHEET_ID ?? "",
  SHEETS_SHEET_NAME: process.env.SHEETS_SHEET_NAME ?? "Hoja1",
  SHEETS_RANGE: process.env.SHEETS_RANGE ?? "A:M",
  SHEETS_CACHE_SECONDS: parseNumber(process.env.SHEETS_CACHE_SECONDS, 120),
  SHEETS_MAX_ROWS: parseNumber(process.env.SHEETS_MAX_ROWS, 5000),

  // Catalogo local CSV (alternativa a Google Sheets)
  CATALOG_FILE_PATH: process.env.CATALOG_FILE_PATH ?? "",

  // Memoria de conversacion
  MEMORY_TTL_MINUTES: parseNumber(process.env.MEMORY_TTL_MINUTES, 30),

  // Timezone para contexto de hora
  TIMEZONE: process.env.TIMEZONE ?? "America/La_Paz"
};

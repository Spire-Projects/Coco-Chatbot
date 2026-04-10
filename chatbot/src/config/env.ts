const parseNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
};

const parseList = (value: string | undefined): string[] => {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const parseLogLevel = (value: string | undefined, fallback: string): string => {
  const allowed = new Set(["fatal", "error", "warn", "info", "debug", "trace", "silent"]);
  const normalized = (value ?? fallback).trim().toLowerCase();
  return allowed.has(normalized) ? normalized : fallback;
};

export const env = {
  LOG_LEVEL: parseLogLevel(process.env.LOG_LEVEL, "info"),
  BAILEYS_LOG_LEVEL: parseLogLevel(process.env.BAILEYS_LOG_LEVEL, "silent"),
  LOG_IGNORED_MESSAGES: parseBoolean(process.env.LOG_IGNORED_MESSAGES, false),
  MESSAGE_BATCH_WINDOW_MS: parseNumber(process.env.MESSAGE_BATCH_WINDOW_MS, 1800),
  MESSAGE_BATCH_MAX_WAIT_MS: parseNumber(process.env.MESSAGE_BATCH_MAX_WAIT_MS, 7000),
  ACTIVE_SESSION_IDS: parseList(process.env.ACTIVE_SESSION_IDS),
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? "",
  GEMINI_MODEL: process.env.GEMINI_MODEL ?? "gemini-1.5-flash",
  API_PORT: parseNumber(process.env.API_PORT, 3100),
  TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL ?? "",
  TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN ?? "",
  PROMPTS_CHAT_CACHE_TTL_SECONDS: parseNumber(process.env.PROMPTS_CHAT_CACHE_TTL_SECONDS, 30),
  PROMPTS_CHAT_CACHE_MAX_MESSAGES: parseNumber(process.env.PROMPTS_CHAT_CACHE_MAX_MESSAGES, 12),
  SHEETS_SPREADSHEET_ID:
    process.env.SHEETS_SPREADSHEET_ID ?? "17dE7NmHIDI4F6Igo75Q4hlZplhbMQDFHg18KZSUWNM0",
  SHEETS_SHEET_NAME: process.env.SHEETS_SHEET_NAME ?? "CATALOGO_BOT",
  SHEETS_RANGE: process.env.SHEETS_RANGE ?? "A1:H",
  SHEETS_PRIMARY_SHEET_NAME:
    process.env.SHEETS_PRIMARY_SHEET_NAME ?? process.env.SHEETS_SHEET_NAME ?? "CATALOGO_BOT",
  SHEETS_PRIMARY_RANGE: process.env.SHEETS_PRIMARY_RANGE ?? process.env.SHEETS_RANGE ?? "A1:H",
  SHEETS_SEMINUEVOS_SHEET_NAME:
    process.env.SHEETS_SEMINUEVOS_SHEET_NAME ?? "EQUIPOS_RECORRIDO",
  SHEETS_SEMINUEVOS_RANGE: process.env.SHEETS_SEMINUEVOS_RANGE ?? "A1:J",
  SHEETS_CACHE_SECONDS: parseNumber(process.env.SHEETS_CACHE_SECONDS, 120),
  MEMORY_TTL_MINUTES: parseNumber(process.env.MEMORY_TTL_MINUTES, 30),
  TEST_DIRECT_ONLY: parseBoolean(process.env.TEST_DIRECT_ONLY, true),
  TEST_RESTRICT_SENDERS: parseBoolean(process.env.TEST_RESTRICT_SENDERS, true),
  TEST_ALLOWED_SENDERS: parseList(process.env.TEST_ALLOWED_SENDERS)
};

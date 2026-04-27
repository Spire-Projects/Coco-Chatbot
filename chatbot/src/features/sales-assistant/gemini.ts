import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../../config/env.js";
import { logger } from "../../core/logger.js";
import { resolvePromptForSession } from "../prompts/service.js";
import type { CatalogItem, ConversationMemory, SalesIntent } from "./types.js";

const modelNotConfiguredMessage =
  "Hola! Puedo ayudarte con informacion de empresas, pero la IA aun no esta configurada. Contacta al administrador.";

/**
 * Respuesta de fallback cuando Gemini no está disponible (403/503/agotado).
 * Devuelve directamente los resultados del directorio sin IA.
 */
const buildFallbackReply = (input: {
  relevantItems: CatalogItem[];
  matchingCount: number;
  memory: ConversationMemory;
}): string => {
  const { relevantItems, matchingCount, memory } = input;
  const rubro = memory.lastRubro || "ese rubro";
  const ciudad = memory.lastUbicacion || "";

  if (relevantItems.length === 0) {
    const contexto = [rubro, ciudad].filter(Boolean).join(" en ");
    return `😕 No encontré empresas de *${contexto}* en el directorio en este momento.\n\n¿Quieres intentar con otro rubro o ciudad?`;
  }

  const header = ciudad
    ? `🔍 Aquí tienes empresas de *${rubro}* en *${ciudad.charAt(0).toUpperCase() + ciudad.slice(1)}*:`
    : `🔍 Aquí tienes empresas de *${rubro}*:`;

  const lista = relevantItems
    .slice(0, 5)
    .map((item, i) => `--- Empresa ${i + 1} ---\n${formatCatalogLine(item)}`)
    .join("\n\n");

  const extra = matchingCount > 5
    ? `\n\n🔎 ¡Y hay *${matchingCount - 5} empresas más*! Dime si quieres ver más resultados.`
    : "";

  return `${header}\n\n${lista}${extra}`;
};

const formatCatalogLine = (item: CatalogItem): string => {
  const ubicacion  = [item.departamento, item.municipio].filter(Boolean).join(", ");
  const actExtras  = item.actividades.slice(1).filter(Boolean);
  const lines: string[] = [];

  lines.push(`🏢 *${item.nombre}*${item.tipoEmpresa ? `  _(${item.tipoEmpresa})_` : ""}`);
  if (ubicacion)               lines.push(`📍 ${ubicacion}`);
  if (item.actividadPrincipal) lines.push(`🔧 ${item.actividadPrincipal}`);
  if (actExtras.length > 0)    lines.push(`• ${actExtras.join(" · ")}`);
  if (item.direccion)          lines.push(`🏠 ${item.direccion}`);
  if (item.telefono)           lines.push(`📞 ${item.telefono}`);
  if (item.email)              lines.push(`📧 ${item.email}`);
  if (item.gerente)            lines.push(`👤 ${item.gerente}`);

  return lines.join("\n");
};

const formatItems = (items: CatalogItem[]): string => {
  if (items.length === 0) return "- Sin coincidencias en el directorio";
  return items.map((item, i) => `--- Empresa ${i + 1} ---\n${formatCatalogLine(item)}`).join("\n\n");
};

const formatMemory = (memory: ConversationMemory): string => {
  const turns = memory.turns
    .slice(-6)
    .map((turn) => `${turn.role.toUpperCase()}: ${turn.text}`)
    .join("\n");

  const contextLines = [
    memory.lastRubro    && `Rubro buscado: ${memory.lastRubro}`,
    memory.lastUbicacion && `Ubicacion mencionada: ${memory.lastUbicacion}`,
  ].filter(Boolean);

  return [
    `Intencion previa: ${memory.lastIntent}`,
    contextLines.length > 0 ? `Contexto acumulado:\n${contextLines.join("\n")}` : "",
    "Ultimos mensajes:",
    turns || "Sin historial"
  ]
    .filter(Boolean)
    .join("\n");
};

const getDateTimeContext = (): string => {
  try {
    return new Intl.DateTimeFormat("es", {
      timeZone: env.TIMEZONE,
      weekday: "long",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(new Date());
  } catch {
    return new Date().toISOString();
  }
};

export const generateReply = async (input: {
  userMessage: string;
  intent: SalesIntent;
  memory: ConversationMemory;
  sessionName: string;
  relevantItems: CatalogItem[];
  totalCatalogItems: number;
  matchingCount: number;
}): Promise<string> => {
  if (!env.GEMINI_API_KEY) {
    return modelNotConfiguredMessage;
  }

  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: env.GEMINI_MODEL,
    generationConfig: { thinkingConfig: { thinkingBudget: 0 } } as never
  });

  const resolvedPrompt = await resolvePromptForSession(input.sessionName);

  const isFirstMessage = input.memory.turns.length === 0;

  const systemPrompt = [
    resolvedPrompt.prompt,
    "Responde en espanol claro y conciso.",
    "Usa siempre la informacion del directorio entregado para responder.",
    "Si no encuentras coincidencias exactas, sugiere opciones similares del directorio.",
    "Nunca inventes informacion que no este en el directorio.",
    isFirstMessage
      ? "Es el PRIMER mensaje de esta conversacion: preséntate brevemente como CoCo 🥥."
      : "NO es el primer mensaje: PROHIBIDO saludar con '¡Hola!' ni presentarte de nuevo. Responde directamente con emojis naturales.",
  ].join(" ");

  const prompt = [
    `INTENCION: ${input.intent}`,
    `HORA: ${getDateTimeContext()}`,
    `MENSAJE DEL USUARIO: ${input.userMessage}`,
    `EMPRESAS ENCONTRADAS PARA ESTA BUSQUEDA: ${input.matchingCount}`,
    `TOTAL EMPRESAS EN DIRECTORIO: ${input.totalCatalogItems}`,
    "EMPRESAS RELEVANTES:",
    formatItems(input.relevantItems),
    "HISTORIAL DE CONVERSACION:",
    formatMemory(input.memory),
    "RESPUESTA:"
  ].join("\n\n");

  // Retry con backoff exponencial para rate limits (429) y errores transitorios (500/502/503)
  const MAX_RETRIES = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await model.generateContent([
        { text: `${systemPrompt}\n\n${prompt}` }
      ]);
      const text = result.response.text().trim();
      return text.length > 0 ? text : "No pude generar una respuesta en este momento. Intenta de nuevo. 😊";
    } catch (err) {
      lastError = err;
      const status = (err as { status?: number })?.status;
      const isRetryable = status === 429 || status === 500 || status === 502 || status === 503;
      if (isRetryable && attempt < MAX_RETRIES) {
        // 429 → espera larga (20s, 40s); 5xx → espera corta (3s, 6s)
        const waitMs = status === 429 ? attempt * 20_000 : attempt * 3_000;
        logger.warn({ attempt, waitMs, status }, `Gemini ${status} — reintentando`);
        await new Promise((res) => setTimeout(res, waitMs));
        continue;
      }
      // Error no reintentable (403, 400, etc.) o reintentos agotados → fallback directo
      logger.warn({ status, attempt }, "Gemini no disponible — usando fallback de directorio");
      return buildFallbackReply({
        relevantItems: input.relevantItems,
        matchingCount: input.matchingCount,
        memory: input.memory,
      });
    }
  }

  // Reintentos agotados → fallback
  logger.warn("Gemini: reintentos agotados — usando fallback de directorio");
  return buildFallbackReply({
    relevantItems: input.relevantItems,
    matchingCount: input.matchingCount,
    memory: input.memory,
  });
};

import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../../config/env.js";
import { logger } from "../../core/logger.js";
import { resolvePromptForSession } from "../prompts/service.js";
import type { CatalogItem, ConversationMemory, SalesIntent } from "./types.js";

const modelNotConfiguredMessage =
  "Hola! Puedo ayudarte con informacion de empresas, pero la IA aun no esta configurada. Contacta al administrador.";

const getHourInBolivia = (): number => {
  try {
    return Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: env.TIMEZONE,
        hour: "numeric",
        hour12: false,
      }).format(new Date())
    );
  } catch {
    return new Date().getHours();
  }
};

const buildGreetingFallback = (memory: ConversationMemory): string => {
  const hour = getHourInBolivia();
  let saludo: string;
  if (hour >= 5 && hour < 12) saludo = "¡Buenos días";
  else if (hour >= 12 && hour < 19) saludo = "¡Buenas tardes";
  else saludo = "¡Buenas noches";

  if (memory.turns.length > 0) {
    return `${saludo} de nuevo! 👋 ¿En qué más puedo ayudarte?`;
  }
  return `${saludo}! 🥥 Soy *CoCo*, tu guía en el Directorio Comercial de Bolivia. ¿Qué tipo de empresa o servicio estás buscando?`;
};

const buildFarewellFallback = (): string => {
  return "¡Fue un gusto ayudarte! 🥥 Hasta la próxima. ¡Que tengas un excelente día! 👋";
};

/**
 * Respuesta de fallback cuando Gemini no está disponible (403/503/agotado).
 * Devuelve directamente los resultados del directorio sin IA.
 */
const buildFallbackReply = (input: {
  relevantItems: CatalogItem[];
  matchingCount: number;
  memory: ConversationMemory;
  intent: SalesIntent;
}): string => {
  const { relevantItems, matchingCount, memory, intent } = input;

  if (intent === "greeting") {
    return buildGreetingFallback(memory);
  }

  if (intent === "farewell") {
    return buildFarewellFallback();
  }

  const rubro = memory.lastRubro || "ese rubro";
  const ciudad = memory.lastUbicacion || "";

  if (relevantItems.length === 0) {
    const contexto = [rubro, ciudad].filter(Boolean).join(" en ");
    return `😕 No encontré empresas de *${contexto}* en el directorio en este momento.\n\n¿Quieres intentar con otro rubro o ciudad?`;
  }

  const header = ciudad
    ? `🔍 Aquí tienes empresas de *${rubro}* en *${ciudad.charAt(0).toUpperCase() + ciudad.slice(1)}*:`
    : `🔍 Aquí tienes empresas de *${rubro}*:`;

  const offset = memory.lastResultOffset || 0;

  // Si no hay items en esta pagina pero hay resultados totales, ya se mostro todo
  if (relevantItems.length === 0 && matchingCount > 0) {
    return `✅ Ya te mostré las *${matchingCount} empresas* de *${rubro}*${ciudad ? ` en *${ciudad.charAt(0).toUpperCase() + ciudad.slice(1)}*` : ""} disponibles en el directorio.\n\n¿Quieres buscar otro rubro o ciudad? 😊`;
  }

  const lista = relevantItems
    .map((item, i) => `--- Empresa ${offset + i + 1} ---\n${formatCatalogLine(item)}`)
    .join("\n\n");

  const shownTotal = offset + relevantItems.length;
  const remaining = matchingCount - shownTotal;
  let extra = "";
  if (remaining > 0) {
    extra = `\n\n🔎 ¡Y hay *${remaining} empresas más*! Dime si quieres ver más resultados.`;
  } else if (relevantItems.length > 0) {
    extra = `\n\n✅ *Se mostraron ${shownTotal} de ${matchingCount} empresas* en total. Es toda la información disponible.`;
  }

  return `${header}\n\n${lista}${extra}`;
};

const formatCatalogLine = (item: CatalogItem): string => {
  const lines: string[] = [];
  lines.push(`🏢 *${item.nombre}*`);
  if (item.direccion)          lines.push(`🏠 ${item.direccion}`);
  if (item.telefono)           lines.push(`📞 ${item.telefono}`);
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
    // Aun sin IA configurada, saluda y despide correctamente
    if (input.intent === "greeting" || input.intent === "farewell") {
      return buildFallbackReply({
        relevantItems: input.relevantItems,
        matchingCount: input.matchingCount,
        memory: input.memory,
        intent: input.intent,
      });
    }
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
    input.intent === "greeting"
      ? "INTENCION DEL USUARIO: SALUDO. Responde con un saludo calido segun la hora del dia. Si es el primer mensaje, preséntate brevemente como CoCo 🥥 y pregunta que rubro busca. Si ya hay historial, saluda brevemente y pregunta como puedes seguir ayudando."
      : input.intent === "farewell"
      ? "INTENCION DEL USUARIO: DESPEDIDA. Responde con una despedida amable y breve. Deséale un buen dia/tarde/noche segun la hora. No ofrezcas mas informacion ni busques empresas."
      : input.intent === "more_results"
      ? "INTENCION DEL USUARIO: PIDE MAS RESULTADOS. El usuario quiere ver mas empresas del MISMO rubro y ubicacion anteriores. No cambies el rubro ni la ciudad. Muestra las siguientes empresas disponibles."
      : isFirstMessage
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
        intent: input.intent,
      });
    }
  }

  // Reintentos agotados → fallback
  logger.warn("Gemini: reintentos agotados — usando fallback de directorio");
  return buildFallbackReply({
    relevantItems: input.relevantItems,
    matchingCount: input.matchingCount,
    memory: input.memory,
    intent: input.intent,
  });
};

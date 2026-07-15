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
 * Respuesta de fallback para mensajes fuera de contexto (deportes, política,
 * charla casual, etc.). El bot rechaza amablemente y redirige a su función.
 */
const buildOutOfScopeFallback = (): string => {
  return [
    "😄 Jaja, eso está fuera de mi zona. ",
    "Soy CoCo 🥥, tu guía del Directorio Comercial de Bolivia. ",
    "Puedo ayudarte a encontrar empresas, negocios y servicios en cualquier departamento de Bolivia. ",
    "¿Qué tipo de empresa o servicio estás buscando? 😊"
  ].join("");
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
  isNameSearch?: boolean;
  companyName?: string;
  isPagination?: boolean;
  pageOffset?: number;
}): string => {
  const { relevantItems, matchingCount, memory, intent } = input;

  if (intent === "greeting") {
    return buildGreetingFallback(memory);
  }

  if (intent === "farewell") {
    return buildFarewellFallback();
  }

  if (intent === "out_of_scope") {
    return buildOutOfScopeFallback();
  }

  const rubro = memory.lastRubro || "ese rubro";
  const ciudad = memory.lastUbicacion || "";

  // ── Búsqueda por nombre exacto (fallback) ──
  if (input.isNameSearch) {
    const nombre = input.companyName || "";
    if (relevantItems.length === 0) {
      return `😕 No encontré ninguna empresa llamada *${nombre}* en el directorio${
        ciudad ? ` para ${ciudad}` : ""
      }.\n\n¿Quieres buscar por rubro en su lugar? 😊`;
    }
    const lista = relevantItems
      .map((item, i) => `--- Empresa ${i + 1} ---\n${formatCatalogLine(item)}`)
      .join("\n\n");
    return `🎯 Encontré *${relevantItems.length}* empresa(s) con ese nombre:\n\n${lista}`;
  }

  // ── Paginación (fallback) ──
  if (input.isPagination) {
    if (relevantItems.length === 0) {
      return "✅ Eso fue todo, no tengo más empresas para esa búsqueda.";
    }
    const start = (input.pageOffset ?? 0) + 1;
    const lista = relevantItems
      .map((item, i) => `--- Empresa ${start + i} ---\n${formatCatalogLine(item)}`)
      .join("\n\n");
    const remaining = matchingCount - (input.pageOffset ?? 0) - relevantItems.length;
    const extra = remaining > 0
      ? `\n\n🔎 ¡Quedan *${remaining} empresas más*! Dime si quieres ver más resultados.`
      : "\n\n✅ Eso fue todo, no tengo más empresas para esta búsqueda.";
    return `📄 Aquí tienes más opciones:\n\n${lista}${extra}`;
  }

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
  /** True cuando la búsqueda fue por nombre exacto de empresa. */
  isNameSearch?: boolean;
  /** Nombre de empresa extraído del mensaje (solo cuando isNameSearch). */
  companyName?: string;
  /** True cuando es una página de resultados (paginación "ver más"). */
  isPagination?: boolean;
  /** Offset de la página actual (cuando isPagination). */
  pageOffset?: number;
}): Promise<string> => {
  if (!env.GEMINI_API_KEY) {
    // Aun sin IA configurada, saluda, despide y rechaza fuera de contexto
    if (input.intent === "greeting" || input.intent === "farewell" || input.intent === "out_of_scope") {
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
      : input.intent === "out_of_scope"
      ? "INTENCION DEL USUARIO: FUERA DE CONTEXTO. El usuario preguntó sobre un tema ajeno al directorio de empresas (deportes, política, clima, entretenimiento, o simplemente charla casual). NO busques en el directorio. Responde con humor y calidez, explicando brevemente que solo puedes ayudar a encontrar empresas y servicios en Bolivia, y ofrécete a buscar lo que necesite. Mantén tu personalidad de CoCo 🥥."
      : input.intent === "more_results"
      ? "INTENCION DEL USUARIO: PIDE MAS RESULTADOS. El usuario quiere ver mas empresas del MISMO rubro y ubicacion anteriores. No cambies el rubro ni la ciudad. Muestra las siguientes empresas disponibles."
      : isFirstMessage
      ? "Es el PRIMER mensaje de esta conversacion: preséntate brevemente como CoCo 🥥."
      : "NO es el primer mensaje: PROHIBIDO saludar con '¡Hola!' ni presentarte de nuevo. Responde directamente con emojis naturales.",
    // ── REGLA ANTI-ECO ──
    "🚫 REGLA ANTI-ECO (MUY IMPORTANTE):",
    "NUNCA repitas ni hagas eco del texto literal que escribió el usuario.",
    "No incluyas en tu respuesta frases como 'empresas de <texto crudo del usuario>' copiando palabra por palabra lo que él escribió, incluyendo sus errores de tipeo.",
    "Interpreta la intención del usuario y responde de forma natural, reformulando con tus propias palabras.",
    "Si el usuario escribió con errores (ej: 'nesecito'), corrige silenciosamente al entender y responde correctamente, sin señalar el error ni repetirlo.",
    "Ejemplo INCORRECTO: 'Aquí tienes empresas de nesecito agencia despachante aduanas en La paz'",
    "Ejemplo CORRECTO: '¡Claro! 🥥 Aquí tienes agencias despachantes de aduanas en La Paz:'",
  ].join(" ");

  // ── Instrucciones específicas según el tipo de búsqueda ──
  let searchContext = "";
  if (input.isNameSearch) {
    searchContext = [
      "🔎 TIPO DE BÚSQUEDA: BÚSQUEDA POR NOMBRE EXACTO.",
      `El usuario está buscando una empresa PUNTUAL por su nombre: "${input.companyName ?? ""}".`,
      "Las EMPRESAS RELEVANTES de abajo ya fueron filtradas SOLO por nombre (no por rubro).",
      "IMPORTANTE: muestra ÚNICAMENTE las empresas de la lista, que coinciden con el nombre pedido.",
      "NO agregues otras empresas del mismo rubro que no estén en la lista.",
      "Si la lista está vacía, dile con naturalidad que no encontraste una empresa con ese nombre y ofrécete a buscar por rubro.",
    ].join(" ");
  } else if (input.isPagination) {
    const shown = (input.pageOffset ?? 0) + input.relevantItems.length;
    const remaining = input.matchingCount - shown;
    searchContext = [
      "📄 TIPO DE BÚSQUEDA: PAGINACIÓN (el usuario pidió ver MÁS resultados).",
      `Estás mostrando la página que empieza en el resultado #${(input.pageOffset ?? 0) + 1}.`,
      `Total de empresas que coinciden con la búsqueda: ${input.matchingCount}.`,
      `Resultados ya mostrados antes de esta página: ${input.pageOffset ?? 0}.`,
      remaining > 0
        ? `Quedan ${remaining} empresas más después de esta página. Al final, indica: '🔎 ¡Quedan ${remaining} empresas más! Dime si quieres ver más resultados.'`
        : "Esta es la ÚLTIMA página. Al final indica que no hay más resultados para esta búsqueda.",
      "NO repitas empresas que ya se mostraron en páginas anteriores (no están en la lista actual).",
      "NO vuelvas a saludar ni a preguntar el rubro/ubicación: ya están en el historial.",
    ].join(" ");
  } else {
    searchContext = [
      "🔎 TIPO DE BÚSQUEDA: BÚSQUEDA POR RUBRO/CATEGORÍA.",
      `Total de empresas que coinciden con la búsqueda: ${input.matchingCount}.`,
      "Muestra hasta 5 empresas de la lista. Si hay más de 5, indica cuántas quedan con: '🔎 ¡Y hay N empresas más! Dime si quieres ver más resultados.'",
    ].join(" ");
  }

  const prompt = [
    `INTENCION: ${input.intent}`,
    `HORA: ${getDateTimeContext()}`,
    `MENSAJE DEL USUARIO: ${input.userMessage}`,
    searchContext,
    `TOTAL EMPRESAS EN DIRECTORIO: ${input.totalCatalogItems}`,
    "EMPRESAS RELEVANTES PARA ESTA RESPUESTA:",
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
        isNameSearch: input.isNameSearch,
        companyName: input.companyName,
        isPagination: input.isPagination,
        pageOffset: input.pageOffset,
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
    isNameSearch: input.isNameSearch,
    companyName: input.companyName,
    isPagination: input.isPagination,
    pageOffset: input.pageOffset,
  });
};

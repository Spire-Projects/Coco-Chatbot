import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../../config/env.js";
import { logger } from "../../core/logger.js";
import { resolvePromptForSession } from "../prompts/service.js";
import type { CatalogItem, ConversationMemory, SalesIntent } from "./types.js";

const modelNotConfiguredMessage =
  "Hola! Puedo ayudarte con informacion de empresas, pero la IA aun no esta configurada. Contacta al administrador.";

const formatCatalogLine = (item: CatalogItem): string => {
  return [
    `- ${item.nombre}`,
    item.tipo ? `Tipo: ${item.tipo}` : "",
    item.descripcion ? `Descripcion: ${item.descripcion}` : "",
    item.ubicacion ? `Ubicacion: ${item.ubicacion}` : "",
    item.contacto ? `Contacto: ${item.contacto}` : "",
    item.horario ? `Horario: ${item.horario}` : "",
    item.extras ? `Info adicional: ${item.extras}` : ""
  ]
    .filter((part) => part.length > 0)
    .join(" | ");
};

const formatItems = (items: CatalogItem[]): string => {
  if (items.length === 0) {
    return "- Sin coincidencias en el directorio";
  }
  return items.map(formatCatalogLine).join("\n");
};

const formatMemory = (memory: ConversationMemory): string => {
  const turns = memory.turns
    .slice(-6)
    .map((turn) => `${turn.role.toUpperCase()}: ${turn.text}`)
    .join("\n");

  return [
    `Intencion previa: ${memory.lastIntent}`,
    "Ultimos mensajes:",
    turns || "Sin historial"
  ].join("\n");
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
}): Promise<string> => {
  if (!env.GEMINI_API_KEY) {
    return modelNotConfiguredMessage;
  }

  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: env.GEMINI_MODEL });

  const resolvedPrompt = await resolvePromptForSession(input.sessionName);

  const systemPrompt = [
    resolvedPrompt.prompt,
    "Responde en espanol claro y conciso.",
    "Usa siempre la informacion del directorio entregado para responder.",
    "Si no encuentras coincidencias exactas, sugiere opciones similares del directorio.",
    "Nunca inventes informacion que no este en el directorio."
  ].join(" ");

  logger.debug(
    { sessionId: input.sessionName },
    "Generando respuesta con Gemini"
  );

  const prompt = [
    `INTENCION: ${input.intent}`,
    `HORA: ${getDateTimeContext()}`,
    `MENSAJE DEL USUARIO: ${input.userMessage}`,
    `TOTAL EMPRESAS EN DIRECTORIO: ${input.totalCatalogItems}`,
    "EMPRESAS RELEVANTES:",
    formatItems(input.relevantItems),
    "HISTORIAL DE CONVERSACION:",
    formatMemory(input.memory),
    "RESPUESTA:"
  ].join("\n\n");

  const result = await model.generateContent([
    { text: `${systemPrompt}\n\n${prompt}` }
  ]);

  const text = result.response.text().trim();
  return text.length > 0 ? text : "No pude generar una respuesta en este momento. Intenta de nuevo.";
};

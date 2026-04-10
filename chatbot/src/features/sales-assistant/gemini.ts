import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../../config/env.js";
import { logger } from "../../core/logger.js";
import { resolvePromptForSession } from "../prompts/service.js";
import type { CatalogItem, ConversationMemory, SalesIntent } from "./types.js";

const modelNotConfiguredMessage =
  "Puedo ayudarte con el catalogo, pero la IA aun no esta configurada correctamente.";

const formatCatalogLine = (item: CatalogItem): string => {
  if (item.source === "seminuevo") {
    return [
      `- ${item.product}`,
      item.storage ? `Almacenamiento: ${item.storage}` : "",
      item.version ? `Version: ${item.version}` : "",
      item.colorVariants ? `Color: ${item.colorVariants}` : "",
      item.battery ? `Bateria: ${item.battery}` : "",
      item.cycles ? `Ciclos: ${item.cycles}` : "",
      item.priceUsd ? `USD: ${item.priceUsd}` : "",
      item.includes ? `Incluye: ${item.includes}` : "",
      item.fullDescription ? `Descripcion: ${item.fullDescription}` : ""
    ]
      .filter((part) => part.length > 0)
      .join(" | ");
  }

  return [
    `- ${item.product}`,
    `Categoria: ${item.category}`,
    `USD: ${item.priceUsd}`,
    item.priceBs ? `BS: ${item.priceBs}` : "",
    `Estado: ${item.status}`,
    item.warranty ? `Garantia: ${item.warranty}` : "",
    item.colorVariants ? `Variantes: ${item.colorVariants}` : ""
  ]
    .filter((part) => part.length > 0)
    .join(" | ");
};

const formatCatalogSection = (title: string, items: CatalogItem[]): string => {
  if (items.length === 0) {
    return `${title}:\n- Sin coincidencias`;
  }

  return `${title}:\n${items.map(formatCatalogLine).join("\n")}`;
};

const formatItems = (items: CatalogItem[]): string => {
  const nuevos = items.filter((item) => item.source === "nuevo");
  const seminuevos = items.filter((item) => item.source === "seminuevo");

  return [
    formatCatalogSection("NUEVOS", nuevos),
    formatCatalogSection("SEMINUEVOS", seminuevos)
  ].join("\n\n");
};

const formatMemory = (memory: ConversationMemory): string => {
  const turns = memory.turns
    .slice(-6)
    .map((turn) => `${turn.role.toUpperCase()}: ${turn.text}`)
    .join("\n");

  return [
    `Intencion previa: ${memory.lastIntent}`,
    `Productos mencionados: ${memory.productsMentioned.join(", ") || "Ninguno"}`,
    `Presupuesto USD: ${memory.budgetUsd ?? "No indicado"}`,
    "Ultimos mensajes:",
    turns || "Sin historial"
  ].join("\n");
};

const getBoliviaDateTimeContext = (): string => {
  try {
    return new Intl.DateTimeFormat("es-BO", {
      timeZone: "America/La_Paz",
      weekday: "long",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).format(new Date());
  } catch {
    return new Date().toISOString();
  }
};

export const generateSalesReply = async (input: {
  userMessage: string;
  intent: SalesIntent;
  memory: ConversationMemory;
  sessionName: string;
  relevantItems: CatalogItem[];
  totalCatalogItems: number;
}): Promise<string> => {
  if (!env.GEMINI_API_KEY || env.GEMINI_API_KEY === "REPLACE_WITH_GEMINI_API_KEY") {
    return modelNotConfiguredMessage;
  }

  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: env.GEMINI_MODEL });

  const resolvedPrompt = await resolvePromptForSession(input.sessionName);

  const systemPrompt = [
    resolvedPrompt.prompt,
    "Responde en espanol claro y breve.",
    "Regla critica: no inventes productos, precios, estado o garantia que no esten en el catalogo entregado.",
    "Si falta informacion, dilo explicitamente y ofrece confirmar con un agente.",
    "Si la intencion es cierre de compra, incluye un llamado a accion para coordinar con agente humano."
  ].join(" ");

  logger.debug(
    {
      sessionId: input.sessionName,
      globalPromptUpdatedAt: resolvedPrompt.globalUpdatedAt,
      sessionPromptUpdatedAt: resolvedPrompt.sessionUpdatedAt
    },
    "Prompt resuelto para Gemini"
  );

  const prompt = [
    `INTENCION ACTUAL: ${input.intent}`,
    `HORA ACTUAL EN BOLIVIA (America/La_Paz): ${getBoliviaDateTimeContext()}`,
    `MENSAJE DEL CLIENTE: ${input.userMessage}`,
    `CATALOGO TOTAL DISPONIBLE: ${input.totalCatalogItems} items`,
    "CATALOGO RELEVANTE:",
    formatItems(input.relevantItems),
    "MEMORIA DE CONVERSACION:",
    formatMemory(input.memory),
    "RESPUESTA:"
  ].join("\n\n");

  const result = await model.generateContent([
    {
      text: `${systemPrompt}\n\n${prompt}`
    }
  ]);

  const text = result.response.text().trim();
  return text.length > 0 ? text : "No pude generar respuesta en este momento.";
};

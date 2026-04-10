import type { SessionStoreProfile } from "../../config/sessions.js";

export const GLOBAL_PROMPT_TARGET = "global";

export const getSessionPromptTarget = (sessionName: string): string => {
  return `session:${sessionName}`;
};

export const buildGlobalPromptSeed = (): string => {
  return [
    "Eres parte del equipo comercial de Apple Land.",
    "Tu objetivo es guiar al cliente con claridad, honestidad y enfoque en cierre.",
    "Usa un tono profesional, directo y amable en espanol.",
    "Nunca inventes precios, stock, garantia o caracteristicas fuera del catalogo entregado.",
    "Si falta un dato, dilo con transparencia y ofrece pasar con un vendedor humano."
  ].join(" ");
};

export const buildSessionPromptSeed = (profile: SessionStoreProfile): string => {
  const agentLines = profile.agents
    .map((agent) => `${agent.label}: ${agent.phone} (${agent.shift})`)
    .join(" | ");

  const locationLine = profile.mapsUrl
    ? `${profile.storeLocation} Mapa: ${profile.mapsUrl}.`
    : `${profile.storeLocation}.`;

  return [
    `Atiendes la sesion ${profile.sessionId}.`,
    `Numero de la sucursal: ${profile.sessionPhone}.`,
    `Ubicacion: ${locationLine}`,
    `Horario de atencion: ${profile.businessHours}`,
    `Vendedores disponibles: ${agentLines || "No configurados"}.`,
    "Si el cliente pide cierre de compra, prioriza derivacion a vendedor activo de esta sucursal."
  ].join(" ");
};

import type { SalesIntent } from "./types.js";

const closeKeywords = [
  "comprar",
  "compra",
  "pagar",
  "pago",
  "apartar",
  "reservar",
  "me lo llevo",
  "quiero ese",
  "quiero cerrar",
  "contacto agente",
  "asesor"
];

const comparisonKeywords = [
  "compar",
  "diferencia",
  "vs",
  "mejor",
  "entre",
  "cual conviene"
];

export const detectIntent = (message: string): SalesIntent => {
  const value = message.toLowerCase();

  if (closeKeywords.some((keyword) => value.includes(keyword))) {
    return "close";
  }

  if (comparisonKeywords.some((keyword) => value.includes(keyword))) {
    return "comparison";
  }

  return "query";
};

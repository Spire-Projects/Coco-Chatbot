import type { SalesIntent } from "./types.js";

const comparisonKeywords = [
  "compara",
  "diferencia",
  "vs",
  "mejor",
  "entre",
  "cual es mejor",
  "cual conviene",
  "recomienda"
];

export const detectIntent = (message: string): SalesIntent => {
  const value = message.toLowerCase();

  if (comparisonKeywords.some((keyword) => value.includes(keyword))) {
    return "comparison";
  }

  return "query";
};


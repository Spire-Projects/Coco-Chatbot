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

const greetingKeywords = [
  "hola", "buenas", "buenos", "buen", "dias", "tardes",
  "dia", "tarde", "mañana", "manana", "hey", "holi",
  "saludos", "que tal", "como estas", "como te va", "qué tal",
  "buen dia", "buena tarde", "hola coco"
];

const farewellKeywords = [
  "adios", "chau", "chao", "hasta luego", "hasta pronto", "nos vemos",
  "bye", "cuidate", "cuídate", "que tengas", "te cuidas",
  "hasta mañana", "hasta la proxima", "nos vemos luego",
  "gracias adios", "gracias chau", "buenas noches", "buena noche"
];

const moreResultsKeywords = [
  "ver mas", "quiero mas", "hay mas", "mostrar mas", "dame mas",
  "otras opciones", "mas opciones", "mas resultados", "mas empresas",
  "siguientes", "otros resultados", "continuar", "seguir", "muestrame mas",
  "hay otras", "hay otros", "ver otros", "ver otras", "quiero ver mas",
  "dime mas", "envia mas", "pasame mas", "mas informacion",
];

const isShortMessage = (msg: string): boolean => msg.trim().split(/\s+/).length <= 6;

export const detectIntent = (message: string): SalesIntent => {
  const value = message.toLowerCase();

  // Detectar peticion de mas resultados (independientemente de longitud)
  if (moreResultsKeywords.some((keyword) => value.includes(keyword))) {
    return "more_results";
  }

  // Solo clasificar como despedida o saludo si el mensaje es corto (evita que
  // "hola busco ferreterias en santa cruz" se clasifique como greeting)
  if (isShortMessage(message) && farewellKeywords.some((keyword) => value.includes(keyword))) {
    return "farewell";
  }

  if (isShortMessage(message) && greetingKeywords.some((keyword) => value.includes(keyword))) {
    return "greeting";
  }

  if (comparisonKeywords.some((keyword) => value.includes(keyword))) {
    return "comparison";
  }

  return "query";
};


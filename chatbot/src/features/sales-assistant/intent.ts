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

/**
 * Temas que están claramente FUERA del alcance del bot (directorio de empresas).
 * Si el mensaje menciona alguno de estos temas, se clasifica como out_of_scope
 * y el bot responde amablemente sin buscar en el directorio.
 */
const outOfScopeTopics = [
  // Deportes
  "futbol", "baloncesto", "basketbol", "tenis", "beisbol", "voley",
  "boxeo", "gano", "perdio", "empato", "partido", "copa", "mundial",
  "libertadores", "champions", "liga", "resultado", "goles", "seleccion",
  "croacia", "espana", "argentina", "brasil", "alemania", "francia",
  "hokey", "hockey", "formula", "f1", "nascar", "ufc", "mma",
  // Política / noticias
  "elecciones", "presidente", "gobierno", "congreso", "senador", "diputado",
  "politica", "politico", "voto", "campaña", "candidato", "partido politico",
  "noticias", "noticia", "periodico", "noticiero",
  // Clima / ciencia / general
  "clima", "temperatura", "lluvia", "pronostico", "pronóstico",
  "receta", "cocinar", "ingredientes",
  // Entretenimiento
  "pelicula", "peliculas", "serie", "series", "netflix", "cancion",
  "musica", "concierto", "videojuego", "juego", "jugar",
  // Preguntas sobre el bot mismo (meta-conversación)
  "como asi", "como es que", "eres un buscador", "eres un bot",
  "eres simple", "que eres", "quien eres tu", "como funcionas",
  "sabias", "prro", "prrro", "jaja", "jajaja", "lol", "xd",
  // Otros
  "horoscopo", "signo", "zodiaco", "amor", "novia", "novio",
  "chiste", "chistes", "adivinanza", "adivinanzas"
];

/**
 * Indicadores de que el mensaje es una pregunta conversacional o comentario
 * que NO busca empresas (sino que charla con el bot).
 */
const conversationalPatterns = [
  "como asi", "como es que", "o sea", "osea", "me explicas",
  "que quieres decir", "no entendi", "no entiendo", "que significa",
  "sabias que", "te gusta", "crees que", "piensas que",
  "eres un", "eres una", "eres simple", "eres tonto", "eres inteligente",
  "quien te creo", "quien te hizo", "como funcionas",
  "no tienes vivo", "tienes vivo", "no vives", "no vives en",
  "por que no", "porque no", "como que no", "no tienes",
  "y por que", "y porque", "y por ubicacion", "por ubicacion"
];

const moreResultsKeywords = [
  "ver mas", "quiero mas", "hay mas", "mostrar mas", "dame mas",
  "otras opciones", "mas opciones", "mas resultados", "mas empresas",
  "siguientes", "otros resultados", "continuar", "seguir", "muestrame mas",
  "hay otras", "hay otros", "ver otros", "ver otras", "quiero ver mas",
  "dime mas", "envia mas", "pasame mas", "mas informacion",
  "ver más", "más resultados", "hay más", "muéstrame más",
  "muestrame los demas", "muéstrame los demás", "los demas", "los demás",
  "siguiente", "otras empresas", "más empresas", "más opciones",
  "continua", "pagina siguiente", "página siguiente",
  "siguiente pagina", "siguiente página"
];

/**
 * Un mensaje se considera "corto" (candidato a saludo/despedida) si tiene
 * como máximo 3 palabras. Esto evita que "hola busco ferreterias en santa
 * cruz" (6 palabras) se clasifique como greeting.
 */
const isShortMessage = (msg: string): boolean => msg.trim().split(/\s+/).length <= 3;

/**
 * Sufijos/indicadores de que el usuario está pidiendo una empresa PUNTUAL
 * por su nombre (no un rubro). La presencia de cualquiera de estos patrones
 * sugiere fuertemente una búsqueda por nombre exacto.
 *
 * NOTA: se evitan indicadores cortos sin puntuación (como "sa" o "srl") porque
 * generarían falsos positivos al coincidir con palabras comunes ("santa",
 * "busca", etc.). Se prefieren las formas con puntuación ("s.a", "s.r.l") y
 * frases guía inequívocas.
 */
const companyNameIndicators = [
  // Formas de razón social CON puntuación (seguras, no generan falsos positivos)
  "s.r.l",
  "s.a.s",
  "s.a",
  // Formas largas específicas
  "limitada",
  "ltda",
  // Frases guía inequívocas
  "empresa llamada",
  "empresa que se llama",
  "la empresa",
  "se llama",
  "con el nombre",
  "con nombre",
  "llamada",
  "llamado"
];

const normalizeForIntent = (text: string): string =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Palabras vacías que suelen rodear al nombre de la empresa en una
 * búsqueda por nombre (ej: "la empresa Santa Fe Viajes", "empresa llamada X").
 */
const NAME_STOP_WORDS = new Set([
  "la", "el", "los", "las", "una", "un", "de", "del", "la empresa",
  "empresa", "llamada", "llamado", "que", "se", "llama", "con", "el",
  "nombre", "con el", "con", "busco", "quiero", "necesito", "ver",
  "mostrar", "dame", "dime", "info", "informacion", "información",
  "por", "favor", "porfavor", "hola", "buenas", "buenos", "dias",
  "tardes", "noches", "hey", "ayuda", "ayudame", "mi", "mis", "tu",
  "su", "sus", "en", "para", "mi", "me", "puedes", "podrias"
]);

/**
 * Extrae el nombre de empresa de un mensaje de búsqueda por nombre.
 * Quita frases guía ("empresa llamada", "la empresa", "se llama"),
 * ubicaciones y stop words, devolviendo el texto más probable del nombre.
 *
 * Ej: "necesito la empresa Santa Fe Viajes S.R.L. en Santa Cruz"
 *     → "santa fe viajes s.r.l"
 */
export const extractCompanyName = (message: string): string => {
  let normalized = normalizeForIntent(message);

  // Eliminar frases guía comunes
  const guidePhrases = [
    "empresa llamada",
    "empresa que se llama",
    "empresa con el nombre",
    "empresa con nombre",
    "la empresa",
    "el nombre",
    "con el nombre",
    "con nombre",
    "se llama",
    "llamada",
    "llamado",
    "empresa"
  ];
  for (const phrase of guidePhrases) {
    normalized = normalized.replace(phrase, " ");
  }
  normalized = normalized.replace(/\s+/g, " ").trim();

  // Eliminar departamentos bolivianos y sus sinónimos del final
  const departments = [
    "la paz", "santa cruz", "cochabamba", "oruro", "potosi",
    "tarija", "beni", "pando", "chuquisaca", "sucre", "trinidad",
    "lapaz", "santacruz", "cbba", "cocha", "scz", "lpz"
  ];
  for (const dept of departments) {
    const re = new RegExp(`\\b${dept}\\b`, "g");
    normalized = normalized.replace(re, " ");
  }
  normalized = normalized.replace(/\s+/g, " ").trim();

  // Filtrar stop words sueltas
  const tokens = normalized.split(" ").filter((w) => w && !NAME_STOP_WORDS.has(w));

  return tokens.join(" ").trim();
};

/**
 * Palabras que indican que el usuario SÍ está buscando empresas/servicios.
 * Si el mensaje contiene alguna de estas, NO se clasifica como out_of_scope.
 */
const businessSearchWords = [
  "empresa", "empresas", "negocio", "negocios", "rubro", "servicio",
  "servicios", "tienda", "tiendas", "local", "locales", "contacto",
  "telefono", "direccion", "donde", "busco", "necesito", "quiero",
  "ferreteria", "farmacia", "restaurante", "hotel", "clinica",
  "taller", "panaderia", "carniceria", "supermercado", "mercado",
  "agencia", "despachante", "aduanas", "viajes", "turismo",
  "transporte", "constructora", "inmobiliaria", "abogado", "dentista",
  "medico", "veterinario", "peluqueria", "gimnasio", "lavanderia",
  "imprenta", "carpinteria", "electricista", "plomero", "mecanico"
];

export const detectIntent = (message: string): SalesIntent => {
  const value = message.toLowerCase();
  const normalized = normalizeForIntent(message);

  // 1. Paginación: el usuario quiere ver más resultados de la búsqueda previa
  //    (se evalúa primero y sin restricción de longitud)
  if (moreResultsKeywords.some((keyword) => normalized.includes(keyword))) {
    return "more_results";
  }

  // 2. Despedida — solo si el mensaje es corto (evita falsos positivos)
  if (isShortMessage(message) && farewellKeywords.some((keyword) => value.includes(keyword))) {
    return "farewell";
  }

  // 3. Saludo — solo si el mensaje es corto (evita que "hola busco ferreterias"
  //    se clasifique como greeting)
  if (isShortMessage(message) && greetingKeywords.some((keyword) => value.includes(keyword))) {
    return "greeting";
  }

  // 4. Comparación
  if (comparisonKeywords.some((keyword) => value.includes(keyword))) {
    return "comparison";
  }

  // 5. Búsqueda por nombre exacto: el mensaje incluye indicadores típicos
  //    de razón social (S.R.L., S.A., Ltda.) o frases como "empresa llamada X"
  if (companyNameIndicators.some((ind) => normalized.includes(ind))) {
    return "name_search";
  }

  // 6. Fuera de contexto: el mensaje menciona temas ajenos al directorio
  //    (deportes, política, clima, etc.) o es conversacional, y NO contiene
  //    palabras de búsqueda de empresas.
  const mentionsOutOfScopeTopic =
    outOfScopeTopics.some((topic) => normalized.includes(topic));
  const isConversational =
    conversationalPatterns.some((pat) => normalized.includes(pat));
  const mentionsBusinessSearch =
    businessSearchWords.some((word) => normalized.includes(word));

  if ((mentionsOutOfScopeTopic || isConversational) && !mentionsBusinessSearch) {
    return "out_of_scope";
  }

  return "query";
};


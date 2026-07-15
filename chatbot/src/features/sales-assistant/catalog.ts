import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { env } from "../../config/env.js";
import type { CatalogItem } from "./types.js";

// ── Per-query result cache ────────────────────────────────────────────────────
// En lugar de cargar las 118k filas completas, cacheamos el resultado de cada
// consulta filtrada por 3 min. Memoria baja y compatible con datos dinámicos.
interface QueryCacheEntry {
  results: CatalogItem[];
  cachedAt: number;
}

const queryCache = new Map<string, QueryCacheEntry>();
const QUERY_CACHE_TTL_MS = 3 * 60 * 1000;   // 3 min por resultado de búsqueda
const QUERY_CACHE_MAX_ENTRIES = 100;

let totalCountCache: { count: number; cachedAt: number } | null = null;
const TOTAL_COUNT_TTL_MS = 10 * 60 * 1000;  // 10 min para el total del directorio

const SHEETS_REQUEST_TIMEOUT_MS = 25000;

const parseGvizResponse = (payload: string) => {
  const startToken = "google.visualization.Query.setResponse(";
  const start = payload.indexOf(startToken);
  if (start === -1) {
    throw new Error("No se encontro respuesta gviz valida");
  }

  const jsonStart = start + startToken.length;
  const jsonEnd = payload.lastIndexOf(");");
  if (jsonEnd === -1) {
    throw new Error("No se encontro cierre gviz valido");
  }

  return JSON.parse(payload.slice(jsonStart, jsonEnd));
};

const toCellText = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
};

const normalizeText = (value: string): string => {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const tokenize = (value: string): string[] => {
  return Array.from(new Set(normalizeText(value).split(" ").filter((term) => term.length >= 2)));
};

// Mapeo de columnas del Google Sheets al CatalogItem
// A(0)=DEPARTAMENTO  B(1)=MUNICIPIO       C(2)=NOMBRE EMPRESA
// D(3)=ACTIVIDAD PRINCIPAL               E(4)=TIPO (unipersonal, SRL...)
// F(5)=NOMBRE GERENTE  G(6)=DIRECCION     H(7)=EMAIL   I(8)=TELEFONO
// J(9)=ACT.SECUNDARIA  K(10)=ACT.3  L(11)=ACT.4  M(12)=ACT.5
const toEmpresaItem = (cells: unknown[]): CatalogItem => {
  const actividades = [
    toCellText(cells[3]),   // D - actividad principal
    toCellText(cells[9]),   // J - actividad secundaria
    toCellText(cells[10]),  // K - actividad 3
    toCellText(cells[11]),  // L - actividad 4
    toCellText(cells[12]),  // M - actividad 5
  ].filter(Boolean);

  return {
    departamento:       toCellText(cells[0]),
    municipio:          toCellText(cells[1]),
    nombre:             toCellText(cells[2]),
    actividadPrincipal: toCellText(cells[3]),
    tipoEmpresa:        toCellText(cells[4]),
    gerente:            toCellText(cells[5]),
    direccion:          toCellText(cells[6]),
    email:              toCellText(cells[7]),
    telefono:           toCellText(cells[8]),
    actividades,
  };
};

// ── gviz Query Builder ────────────────────────────────────────────────────────
// Google Sheets gviz asigna el ID de columna igual a la letra de la columna:
// A=Dpto  B=Mpio  C=Nombre  D=ActPpal  E=Tipo
// F=Gerente  G=Dir  H=Email  I=Tel  J-M=ActSecundarias
// NOTA: lower() en gviz NO normaliza tildes, pero 'contains' sí es case-insensitive.

/** Elimina comillas simples y chars peligrosos para evitar inyección TQ. */
const sanitizeTerm = (term: string): string =>
  term.replace(/'/g, "").replace(/[^a-z0-9 ]/g, "").trim().slice(0, 50);

/**
 * Genera un prefijo corto para búsquedas tolerantes a tildes.
 * Ej: "ferreteria" → "ferreteri" matchea "Ferretería" y "FERRETERIA".
 */
const makeStem = (term: string): string => {
  const safe = sanitizeTerm(normalizeText(term));
  return safe.length > 5 ? safe.slice(0, Math.max(5, safe.length - 2)) : safe;
};

/**
 * Construye la query TQ para gviz usando letras de columna (A, B, C…).
 * Retorna null si no hay términos válidos.
 */
const buildGvizQuery = (
  rubroTerms: string[],
  locationTerms: string[],
  limit: number,
  offset = 0
): string | null => {
  const conditions: string[] = [];

  if (rubroTerms.length > 0) {
    // Buscar en Nombre (C), Actividad principal (D), y actividades secundarias (J,K,L,M)
    const actCols = ["C", "D", "J", "K", "L", "M"];
    const parts = rubroTerms.flatMap((t) => {
      const stem = makeStem(t);
      if (!stem) return [];
      return actCols.map((col) => `lower(${col}) contains '${stem}'`);
    });
    if (parts.length > 0) conditions.push(`(${parts.join(" or ")})`);
  }

  if (locationTerms.length > 0) {
    // Buscar en Departamento (A) y Municipio (B)
    const locCols = ["A", "B"];
    const parts = locationTerms.flatMap((t) => {
      const stem = makeStem(t);
      if (!stem) return [];
      return locCols.map((col) => `lower(${col}) contains '${stem}'`);
    });
    if (parts.length > 0) conditions.push(`(${parts.join(" or ")})`);
  }

  if (conditions.length === 0) return null;
  const offsetClause = offset > 0 ? ` offset ${offset}` : "";
  return `select * where ${conditions.join(" and ")} limit ${limit}${offsetClause}`;
};

/**
 * Construye una query TQ para buscar por NOMBRE EXACTO de empresa.
 * A diferencia de buildGvizQuery, aquí buscamos coincidencia del nombre
 * completo en la columna C (Nombre), tolerante a tildes y mayúsculas.
 * Devuelve null si no hay un nombre válido.
 */
const buildGvizNameQuery = (
  name: string,
  locationTerms: string[],
  limit: number
): string | null => {
  const safeName = sanitizeTerm(normalizeText(name)).trim();
  if (safeName.length < 3) return null;

  // Coincidencia por nombre: usamos el stem del nombre completo para tolerar
  // tildes y variaciones menores. Buscamos SOLO en la columna C (Nombre).
  const nameStem = makeStem(safeName);
  const conditions: string[] = [`lower(C) contains '${nameStem}'`];

  if (locationTerms.length > 0) {
    const locCols = ["A", "B"];
    const parts = locationTerms.flatMap((t) => {
      const stem = makeStem(t);
      if (!stem) return [];
      return locCols.map((col) => `lower(${col}) contains '${stem}'`);
    });
    if (parts.length > 0) conditions.push(`(${parts.join(" or ")})`);
  }

  return `select * where ${conditions.join(" and ")} limit ${limit}`;
};

/** Fila de cabeceras del sheet — se usa para saltar la primera fila en resultados */
const HEADER_ROW_IDENTIFIER = "LISTA DE EMPRESAS";

const makeSheetUrl = (tq: string): string => {
  const url = new URL(
    `https://docs.google.com/spreadsheets/d/${env.SHEETS_SPREADSHEET_ID}/gviz/tq`
  );
  url.searchParams.set("tqx", "out:json");
  url.searchParams.set("sheet", env.SHEETS_SHEET_NAME);
  url.searchParams.set("range", env.SHEETS_RANGE);
  url.searchParams.set("tq", tq);
  return url.toString();
};

const fetchFromSheet = async (tq: string): Promise<CatalogItem[]> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SHEETS_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(makeSheetUrl(tq), { signal: controller.signal });
    if (!response.ok) throw new Error(`Google Sheets error: ${response.status}`);
    const payload = await response.text();
    const parsed = parseGvizResponse(payload);
    const rows: Array<{ c: Array<{ v: unknown; f?: string } | null> }> = parsed?.table?.rows ?? [];
    return rows
      .map((row) => row.c.map((cell) => cell?.f ?? cell?.v ?? ""))
      .filter((cells) => !String(cells[0] ?? "").includes(HEADER_ROW_IDENTIFIER))
      .map(toEmpresaItem)
      .filter((item) => item.nombre.length > 1 && !item.nombre.includes(HEADER_ROW_IDENTIFIER));
  } finally {
    clearTimeout(timeout);
  }
};



// ── Lector CSV local (alternativa a Google Sheets) ─────────────────────
// Convierte una fila CSV a array de valores (maneja campos entre comillas)
const parseCsvRow = (line: string): string[] => {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }

  fields.push(current.trim());
  return fields;
};

const readItemsFromCsvFile = (filePath: string): CatalogItem[] => {
  const absolutePath = resolve(filePath);
  const raw = readFileSync(absolutePath, "utf-8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);

  // Saltar fila de encabezados
  return lines
    .slice(1)
    .map((line) => parseCsvRow(line))
    .map(toEmpresaItem)
    .filter((item) => item.nombre.length > 0);
};

// ── API Pública ───────────────────────────────────────────────────────────────

/**
 * Busca empresas enviando una consulta filtrada directamente a Google Sheets.
 * No carga las 118k filas: filtra en servidor y cachea cada resultado 3 min.
 */
export const searchCatalog = async (
  rubroTerms: string[],
  locationTerms: string[],
  limit = 15,
  offset = 0
): Promise<CatalogItem[]> => {
  if (env.CATALOG_FILE_PATH) {
    const items = readItemsFromCsvFile(env.CATALOG_FILE_PATH);
    return filterCsvItems(items, rubroTerms, locationTerms, limit, offset);
  }

  const tq = buildGvizQuery(rubroTerms, locationTerms, limit, offset);
  if (!tq) return [];

  const cached = queryCache.get(tq);
  if (cached && Date.now() - cached.cachedAt < QUERY_CACHE_TTL_MS) {
    return cached.results;
  }

  const results = await fetchFromSheet(tq);

  if (queryCache.size >= QUERY_CACHE_MAX_ENTRIES) {
    const oldest = [...queryCache.entries()].sort((a, b) => a[1].cachedAt - b[1].cachedAt)[0];
    queryCache.delete(oldest[0]);
  }
  queryCache.set(tq, { results, cachedAt: Date.now() });
  return results;
};

/**
 * Busca empresas por NOMBRE EXACTO (o casi exacto).
 * A diferencia de searchCatalog, aquí solo se busca en la columna Nombre (C),
 * por lo que no se mezclan resultados de otras empresas del mismo rubro.
 *
 * Devuelve las empresas cuyo nombre coincide con el término proporcionado,
 * opcionalmente filtradas por ubicación.
 */
export const searchCatalogByName = async (
  name: string,
  locationTerms: string[],
  limit = 10
): Promise<CatalogItem[]> => {
  if (env.CATALOG_FILE_PATH) {
    const items = readItemsFromCsvFile(env.CATALOG_FILE_PATH);
    return filterCsvItemsByName(items, name, locationTerms, limit);
  }

  const tq = buildGvizNameQuery(name, locationTerms, limit);
  if (!tq) return [];

  const cached = queryCache.get(tq);
  if (cached && Date.now() - cached.cachedAt < QUERY_CACHE_TTL_MS) {
    return cached.results;
  }

  const results = await fetchFromSheet(tq);

  if (queryCache.size >= QUERY_CACHE_MAX_ENTRIES) {
    const oldest = [...queryCache.entries()].sort((a, b) => a[1].cachedAt - b[1].cachedAt)[0];
    queryCache.delete(oldest[0]);
  }
  queryCache.set(tq, { results, cachedAt: Date.now() });
  return results;
};

/**
 * Cuenta el total de empresas que coinciden con los términos de rubro y
 * ubicación (sin aplicar limit/offset). Se usa para saber si hay más
 * resultados por mostrar en la paginación ("ver más resultados").
 */
export const countCatalog = async (
  rubroTerms: string[],
  locationTerms: string[]
): Promise<number> => {
  if (env.CATALOG_FILE_PATH) {
    const items = readItemsFromCsvFile(env.CATALOG_FILE_PATH);
    // Reutiliza el filtro sin limit y cuenta
    const all = filterCsvItems(items, rubroTerms, locationTerms, Number.MAX_SAFE_INTEGER, 0);
    return all.length;
  }

  const where = buildGvizWhereClause(rubroTerms, locationTerms);
  if (!where) return 0;

  const tq = `select count(A) where ${where}`;
  const cacheKey = `count:${tq}`;
  const cached = queryCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < QUERY_CACHE_TTL_MS) {
    return (cached.results[0] as unknown as { count: number }).count;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SHEETS_REQUEST_TIMEOUT_MS);
    const url = makeSheetUrl(tq);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return 0;
    const payload = await response.text();
    const parsed = parseGvizResponse(payload);
    const rows = parsed?.table?.rows ?? [];
    const count = Number(rows[0]?.c?.[0]?.v ?? 0);
    queryCache.set(cacheKey, {
      results: [{ count } as unknown as CatalogItem],
      cachedAt: Date.now()
    });
    return count;
  } catch {
    return 0;
  }
};

/**
 * Construye solo la cláusula WHERE (sin select/limit) reutilizando la
 * misma lógica de buildGvizQuery. Útil para consultas count.
 */
const buildGvizWhereClause = (
  rubroTerms: string[],
  locationTerms: string[]
): string | null => {
  const conditions: string[] = [];

  if (rubroTerms.length > 0) {
    const actCols = ["C", "D", "J", "K", "L", "M"];
    const parts = rubroTerms.flatMap((t) => {
      const stem = makeStem(t);
      if (!stem) return [];
      return actCols.map((col) => `lower(${col}) contains '${stem}'`);
    });
    if (parts.length > 0) conditions.push(`(${parts.join(" or ")})`);
  }

  if (locationTerms.length > 0) {
    const locCols = ["A", "B"];
    const parts = locationTerms.flatMap((t) => {
      const stem = makeStem(t);
      if (!stem) return [];
      return locCols.map((col) => `lower(${col}) contains '${stem}'`);
    });
    if (parts.length > 0) conditions.push(`(${parts.join(" or ")})`);
  }

  if (conditions.length === 0) return null;
  return conditions.join(" and ");
};

/**
 * Total de empresas en el directorio (cacheado 10 min).
 * Se usa como contexto informativo en el prompt de Gemini.
 */
export const getTotalCount = async (): Promise<number> => {
  if (totalCountCache && Date.now() - totalCountCache.cachedAt < TOTAL_COUNT_TTL_MS) {
    return totalCountCache.count;
  }
  if (env.CATALOG_FILE_PATH) return 0;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SHEETS_REQUEST_TIMEOUT_MS);
    const url = makeSheetUrl("select count(A)");
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return totalCountCache?.count ?? 0;
    const payload = await response.text();
    const parsed = parseGvizResponse(payload);
    const rows = parsed?.table?.rows ?? [];
    const count = Number(rows[0]?.c?.[0]?.v ?? 0);
    // El count de gviz con headers incluye la fila de cabecera; restamos 1
    const real = count > 1 ? count - 1 : count;
    if (real > 0) totalCountCache = { count: real, cachedAt: Date.now() };
    return real;
  } catch {
    return totalCountCache?.count ?? 0;
  }
};

// ── Filtro para modo CSV local ────────────────────────────────────────────────
const filterCsvItems = (
  items: CatalogItem[],
  rubroTerms: string[],
  locationTerms: string[],
  limit: number,
  offset = 0
): CatalogItem[] => {
  if (rubroTerms.length === 0 && locationTerms.length === 0) {
    return items.slice(offset, offset + limit);
  }
  const rubroNorm = rubroTerms.map(normalizeText);
  const locNorm   = locationTerms.map(normalizeText);
  return items
    .filter((item) => {
      const actBlob = normalizeText(item.actividades.join(" ") + " " + item.nombre);
      const locBlob = normalizeText(item.departamento + " " + item.municipio);
      const rubroOk = rubroNorm.length === 0 || rubroNorm.some((t) => actBlob.includes(t));
      const locOk   = locNorm.length === 0   || locNorm.some((t) => locBlob.includes(t));
      return rubroOk && locOk;
    })
    .slice(offset, offset + limit);
};

/**
 * Filtro por nombre exacto para modo CSV local.
 * Solo compara contra el campo `nombre` (no actividades), para evitar
 * mezclar empresas del mismo rubro que no son la buscada.
 */
const filterCsvItemsByName = (
  items: CatalogItem[],
  name: string,
  locationTerms: string[],
  limit: number
): CatalogItem[] => {
  const nameNorm = normalizeText(name);
  if (nameNorm.length < 3) return [];
  const locNorm = locationTerms.map(normalizeText);

  // Primero intento: coincidencia exacta (normalizada) del nombre completo
  let matches = items.filter((item) => normalizeText(item.nombre) === nameNorm);

  // Si no hay exacta, buscamos por inclusión del nombre en el campo nombre
  if (matches.length === 0) {
    matches = items.filter((item) => normalizeText(item.nombre).includes(nameNorm));
  }

  // Filtro de ubicación si fue proporcionada
  if (locNorm.length > 0) {
    matches = matches.filter((item) => {
      const locBlob = normalizeText(item.departamento + " " + item.municipio);
      return locNorm.some((t) => locBlob.includes(t));
    });
  }

  return matches.slice(0, limit);
};


import { env } from "../../config/env.js";
import type { CatalogItem } from "./types.js";

interface IndexedCatalogItem {
  item: CatalogItem;
  nombre: string;
  tipo: string;
  descripcion: string;
  ubicacion: string;
  contacto: string;
  horario: string;
  extras: string;
  blob: string;
}

let cache: { updatedAt: number; items: CatalogItem[]; indexed: IndexedCatalogItem[] } | null = null;
let staleCache: { items: CatalogItem[]; indexed: IndexedCatalogItem[] } | null = null;
let inflightRequest: Promise<CatalogItem[]> | null = null;
const SHEETS_REQUEST_TIMEOUT_MS = 8000;

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

// Mapeo de columnas del Excel al CatalogItem
// A(0)=index  B(1)=nombre  C(2)=tipo  D(3)=descripcion
// E(4)=ubicacion  F(5)=contacto  G(6)=horario  H(7)=extras
// Actualizar este mapeo cuando llegue la plantilla real del cliente
const toEmpresaItem = (cells: unknown[]): CatalogItem => {
  return {
    index: toCellText(cells[0]),
    nombre: toCellText(cells[1]),
    tipo: toCellText(cells[2]),
    descripcion: toCellText(cells[3]),
    ubicacion: toCellText(cells[4]),
    contacto: toCellText(cells[5]),
    horario: toCellText(cells[6]),
    extras: toCellText(cells[7])
  };
};

const isCacheValid = (): boolean => {
  if (!cache) return false;
  return Date.now() - cache.updatedAt <= env.SHEETS_CACHE_SECONDS * 1000;
};

const toIndexedCatalogItems = (items: CatalogItem[]): IndexedCatalogItem[] => {
  return items.map((item) => {
    const nombre = normalizeText(item.nombre);
    const tipo = normalizeText(item.tipo);
    const descripcion = normalizeText(item.descripcion);
    const ubicacion = normalizeText(item.ubicacion);
    const contacto = normalizeText(item.contacto);
    const horario = normalizeText(item.horario);
    const extras = normalizeText(item.extras);

    return {
      item,
      nombre,
      tipo,
      descripcion,
      ubicacion,
      contacto,
      horario,
      extras,
      blob: `${nombre} ${tipo} ${descripcion} ${ubicacion} ${contacto} ${horario} ${extras}`.trim()
    };
  });
};

const fetchItemsFromSheet = async (): Promise<CatalogItem[]> => {
  const url = new URL(
    `https://docs.google.com/spreadsheets/d/${env.SHEETS_SPREADSHEET_ID}/gviz/tq`
  );
  url.searchParams.set("tqx", "out:json");
  url.searchParams.set("sheet", env.SHEETS_SHEET_NAME);
  url.searchParams.set("range", env.SHEETS_RANGE);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SHEETS_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Error leyendo Google Sheets: ${response.status}`);
    }

    const payload = await response.text();
    const parsed = parseGvizResponse(payload);
    const rows: Array<{ c: Array<{ v: unknown } | null> }> = parsed?.table?.rows ?? [];

    return rows
      .map((row) => row.c.map((cell) => cell?.v ?? ""))
      .map(toEmpresaItem)
      .filter((item) => item.nombre.length > 0);
  } finally {
    clearTimeout(timeout);
  }
};

export const getCatalogItems = async (): Promise<CatalogItem[]> => {
  if (isCacheValid() && cache) {
    return cache.items;
  }

  if (inflightRequest) {
    return inflightRequest;
  }

  inflightRequest = (async () => {
    try {
      const items = await fetchItemsFromSheet();

      const indexed = toIndexedCatalogItems(items);
      cache = { updatedAt: Date.now(), items, indexed };
      staleCache = { items, indexed };

      return items;
    } catch (error) {
      if (staleCache && staleCache.items.length > 0) {
        return staleCache.items;
      }
      throw error;
    } finally {
      inflightRequest = null;
    }
  })();

  return inflightRequest;
};

export const findRelevantCatalogItems = (
  items: CatalogItem[],
  query: string,
  maxItems = 10
): CatalogItem[] => {
  const terms = tokenize(query);

  if (terms.length === 0) {
    return items.slice(0, maxItems);
  }

  const indexed = cache && cache.items === items ? cache.indexed : toIndexedCatalogItems(items);
  const normalizedQuery = normalizeText(query);

  const scored = indexed
    .map((entry) => {
      let score = 0;

      for (const term of terms) {
        let termScore = 0;

        if (entry.nombre.includes(term)) {
          termScore = Math.max(termScore, 4);
        }
        if (entry.tipo.includes(term)) {
          termScore = Math.max(termScore, 5); // tipo es el campo mas relevante
        }
        if (entry.descripcion.includes(term) || entry.ubicacion.includes(term)) {
          termScore = Math.max(termScore, 2);
        }
        if (entry.blob.includes(term)) {
          termScore = Math.max(termScore, 1);
        }

        score += termScore;
      }

      if (normalizedQuery.length >= 3 && entry.tipo.includes(normalizedQuery)) {
        score += 5;
      } else if (normalizedQuery.length >= 3 && entry.nombre.includes(normalizedQuery)) {
        score += 4;
      }

      return { item: entry.item, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxItems)
    .map((entry) => entry.item);

  return scored.length > 0 ? scored : items.slice(0, maxItems);
};

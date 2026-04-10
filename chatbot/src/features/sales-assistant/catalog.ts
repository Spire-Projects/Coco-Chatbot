import { env } from "../../config/env.js";
import type { CatalogItem, CatalogSource } from "./types.js";

interface IndexedCatalogItem {
  item: CatalogItem;
  product: string;
  category: string;
  colorVariants: string;
  status: string;
  priceUsd: string;
  storage: string;
  version: string;
  battery: string;
  cycles: string;
  includes: string;
  fullDescription: string;
  blob: string;
}

interface CatalogSheetSpec {
  source: CatalogSource;
  sheetName: string;
  range: string;
  toItem: (cells: unknown[]) => CatalogItem;
}

let cache: { updatedAt: number; items: CatalogItem[]; indexed: IndexedCatalogItem[] } | null = null;
// staleCache persists even after cache expires — used as fallback when a fresh fetch fails
let staleCache: { items: CatalogItem[]; indexed: IndexedCatalogItem[] } | null = null;
let inflightCatalogRequest: Promise<CatalogItem[]> | null = null;
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

const toPrimaryCatalogItem = (cells: unknown[]): CatalogItem => {
  return {
    source: "nuevo",
    index: toCellText(cells[0]),
    product: toCellText(cells[1]),
    category: toCellText(cells[2]),
    priceUsd: toCellText(cells[3]),
    priceBs: toCellText(cells[4]),
    warranty: toCellText(cells[5]),
    status: toCellText(cells[6]),
    colorVariants: toCellText(cells[7])
  };
};

const toSeminuevoCatalogItem = (cells: unknown[]): CatalogItem => {
  const storage = toCellText(cells[2]);
  const version = toCellText(cells[3]);
  const color = toCellText(cells[4]);
  const battery = toCellText(cells[5]);
  const cycles = toCellText(cells[6]);

  const status = [
    battery.length > 0 ? `Bateria ${battery}` : "",
    cycles.length > 0 ? `${cycles} ciclos` : ""
  ]
    .filter((part) => part.length > 0)
    .join(" | ");

  return {
    source: "seminuevo",
    index: toCellText(cells[0]),
    product: toCellText(cells[1]),
    category: storage.length > 0 ? `Seminuevo ${storage}` : "Seminuevo",
    priceUsd: toCellText(cells[7]),
    priceBs: toCellText(cells[8]),
    warranty: "",
    status: status || "Seminuevo",
    colorVariants: color,
    storage,
    version,
    battery,
    cycles,
    includes: toCellText(cells[9]),
    fullDescription: toCellText(cells[10])
  };
};

const CATALOG_SHEETS: CatalogSheetSpec[] = [
  {
    source: "nuevo",
    sheetName: env.SHEETS_PRIMARY_SHEET_NAME,
    range: env.SHEETS_PRIMARY_RANGE,
    toItem: toPrimaryCatalogItem
  },
  {
    source: "seminuevo",
    sheetName: env.SHEETS_SEMINUEVOS_SHEET_NAME,
    range: env.SHEETS_SEMINUEVOS_RANGE,
    toItem: toSeminuevoCatalogItem
  }
];

const isCacheValid = (): boolean => {
  if (!cache) {
    return false;
  }

  const ageMs = Date.now() - cache.updatedAt;
  return ageMs <= env.SHEETS_CACHE_SECONDS * 1000;
};

const toIndexedCatalogItems = (items: CatalogItem[]): IndexedCatalogItem[] => {
  return items.map((item) => {
    const product = normalizeText(item.product);
    const category = normalizeText(item.category);
    const colorVariants = normalizeText(item.colorVariants);
    const status = normalizeText(item.status);
    const priceUsd = normalizeText(item.priceUsd);
    const storage = normalizeText(item.storage ?? "");
    const version = normalizeText(item.version ?? "");
    const battery = normalizeText(item.battery ?? "");
    const cycles = normalizeText(item.cycles ?? "");
    const includes = normalizeText(item.includes ?? "");
    const fullDescription = normalizeText(item.fullDescription ?? "");

    return {
      item,
      product,
      category,
      colorVariants,
      status,
      priceUsd,
      storage,
      version,
      battery,
      cycles,
      includes,
      fullDescription,
      blob: `${product} ${category} ${colorVariants} ${status} ${priceUsd} ${storage} ${version} ${battery} ${cycles} ${includes} ${fullDescription}`.trim()
    };
  });
};

const fetchCatalogItemsFromSheet = async (sheetSpec: CatalogSheetSpec): Promise<CatalogItem[]> => {
  const url = new URL(
    `https://docs.google.com/spreadsheets/d/${env.SHEETS_SPREADSHEET_ID}/gviz/tq`
  );
  url.searchParams.set("tqx", "out:json");
  url.searchParams.set("sheet", sheetSpec.sheetName);
  url.searchParams.set("range", sheetSpec.range);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SHEETS_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Error leyendo Sheet: ${response.status}`);
    }

    const payload = await response.text();
    const parsed = parseGvizResponse(payload);
    const rows: Array<{ c: Array<{ v: unknown } | null> }> = parsed?.table?.rows ?? [];

    return rows
      .map((row) => row.c.map((cell) => cell?.v ?? ""))
      .map(sheetSpec.toItem)
      .filter((item) => item.product.length > 0);
  } finally {
    clearTimeout(timeout);
  }
};

export const getCatalogItems = async (): Promise<CatalogItem[]> => {
  if (isCacheValid() && cache) {
    return cache.items;
  }

  if (inflightCatalogRequest) {
    return inflightCatalogRequest;
  }

  inflightCatalogRequest = (async () => {
    try {
      const settled = await Promise.allSettled(
        CATALOG_SHEETS.map((sheetSpec) => fetchCatalogItemsFromSheet(sheetSpec))
      );

      const items = settled
        .filter((result): result is PromiseFulfilledResult<CatalogItem[]> => result.status === "fulfilled")
        .flatMap((result) => result.value);

      if (items.length === 0) {
        const firstError = settled.find(
          (result): result is PromiseRejectedResult => result.status === "rejected"
        );
        throw firstError?.reason ?? new Error("No se pudieron leer hojas de catalogo");
      }

      const indexed = toIndexedCatalogItems(items);
      cache = { updatedAt: Date.now(), items, indexed };
      staleCache = { items, indexed };

      return items;
    } catch (error) {
      // Prefer fresh cache, then stale cache, then throw
      if (cache && cache.items.length > 0) {
        return cache.items;
      }

      if (staleCache && staleCache.items.length > 0) {
        return staleCache.items;
      }

      throw error;
    } finally {
      inflightCatalogRequest = null;
    }
  })();

  return inflightCatalogRequest;
};

export const findRelevantCatalogItems = (
  items: CatalogItem[],
  query: string,
  maxItems = 8
): CatalogItem[] => {
  const terms = tokenize(query);

  if (terms.length === 0) {
    return items.slice(0, maxItems);
  }

  const indexed =
    cache && cache.items === items ? cache.indexed : toIndexedCatalogItems(items);

  const normalizedQuery = normalizeText(query);

  const scored = indexed
    .map((entry) => {
      const {
        product,
        category,
        colorVariants,
        status,
        priceUsd,
        storage,
        version,
        battery,
        cycles,
        includes,
        fullDescription,
        blob
      } = entry;

      let score = 0;
      for (const term of terms) {
        let termScore = 0;

        if (product.includes(term)) {
          termScore = Math.max(termScore, 4);
        }

        if (
          category.includes(term) ||
          colorVariants.includes(term) ||
          storage.includes(term) ||
          version.includes(term)
        ) {
          termScore = Math.max(termScore, 2);
        }

        if (battery.includes(term)) {
          termScore = Math.max(termScore, 2);
        }

        if (priceUsd.includes(term)) {
          termScore = Math.max(termScore, 1);
        }

        if (
          status.includes(term) ||
          cycles.includes(term) ||
          includes.includes(term) ||
          fullDescription.includes(term) ||
          blob.includes(term)
        ) {
          termScore = Math.max(termScore, 1);
        }

        score += termScore;
      }

      if (normalizedQuery.length >= 3 && product.includes(normalizedQuery)) {
        score += 4;
      } else if (normalizedQuery.length >= 3 && fullDescription.includes(normalizedQuery)) {
        score += 2;
      }

      return { item: entry.item, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxItems)
    .map((entry) => entry.item);

  return scored.length > 0 ? scored : items.slice(0, maxItems);
};

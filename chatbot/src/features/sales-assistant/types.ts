export type SalesIntent = "query" | "comparison" | "close";

export type CatalogSource = "nuevo" | "seminuevo";

export interface CatalogItem {
  source: CatalogSource;
  index: string;
  product: string;
  category: string;
  priceUsd: string;
  priceBs: string;
  warranty: string;
  status: string;
  colorVariants: string;
  storage?: string;
  version?: string;
  battery?: string;
  cycles?: string;
  includes?: string;
  fullDescription?: string;
}

export interface ConversationTurn {
  role: "user" | "assistant";
  text: string;
  at: number;
}

export interface ConversationMemory {
  jid: string;
  createdAt: number;
  lastActivityAt: number;
  turns: ConversationTurn[];
  productsMentioned: string[];
  budgetUsd?: string;
  lastIntent: SalesIntent;
}

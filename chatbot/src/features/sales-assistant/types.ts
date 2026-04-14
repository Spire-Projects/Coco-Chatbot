export type SalesIntent = "query" | "comparison";

export interface CatalogItem {
  index: string;
  nombre: string;
  tipo: string;
  descripcion: string;
  ubicacion: string;
  contacto: string;
  horario: string;
  extras: string;
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
  lastIntent: SalesIntent;
}

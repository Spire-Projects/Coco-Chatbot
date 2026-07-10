import { env } from "../../config/env.js";
import type { ConversationMemory, ConversationTurn, SalesIntent } from "./types.js";

const store = new Map<string, ConversationMemory>();
const ttlMs = env.MEMORY_TTL_MINUTES * 60 * 1000;
const maxTurns = 12;

const now = () => Date.now();

const isExpired = (memory: ConversationMemory): boolean => {
  return now() - memory.lastActivityAt > ttlMs;
};

const cleanupExpired = () => {
  for (const [jid, memory] of store.entries()) {
    if (isExpired(memory)) {
      store.delete(jid);
    }
  }
};

export const getConversationMemory = (jid: string): ConversationMemory => {
  return getConversationMemoryByKey(jid);
};

const getConversationMemoryByKey = (key: string): ConversationMemory => {
  cleanupExpired();

  const existing = store.get(key);
  if (existing) {
    existing.lastActivityAt = now();
    return existing;
  }

  const created: ConversationMemory = {
    jid: key,
    createdAt: now(),
    lastActivityAt: now(),
    turns: [],
    productsMentioned: [],
    lastIntent: "query",
    lastRubro: "",
    lastUbicacion: "",
    lastResultOffset: 0,
  };

  store.set(key, created);
  return created;
};

export const getConversationMemoryScoped = (
  sessionId: string,
  jid: string
): ConversationMemory => {
  return getConversationMemoryByKey(`${sessionId}:${jid}`);
};

export const addConversationTurn = (
  jid: string,
  turn: ConversationTurn,
  lastIntent: SalesIntent,
  products: string[],
  budgetUsd?: string
) => {
  const memory = getConversationMemoryByKey(jid);
  memory.turns.push(turn);
  memory.lastIntent = lastIntent;
  memory.lastActivityAt = now();

  for (const product of products) {
    if (!memory.productsMentioned.includes(product)) {
      memory.productsMentioned.push(product);
    }
  }

  if (memory.turns.length > maxTurns) {
    memory.turns = memory.turns.slice(memory.turns.length - maxTurns);
  }
};

export const clearConversationMemory = (jid: string) => {
  store.delete(jid);
};

export const addConversationTurnScoped = (
  sessionId: string,
  jid: string,
  turn: ConversationTurn,
  lastIntent: SalesIntent,
  products: string[],
  budgetUsd?: string
) => {
  addConversationTurn(`${sessionId}:${jid}`, turn, lastIntent, products, budgetUsd);
};

export const clearConversationMemoryScoped = (sessionId: string, jid: string) => {
  clearConversationMemory(`${sessionId}:${jid}`);
};

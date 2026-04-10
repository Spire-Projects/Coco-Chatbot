import type { SessionStoreProfile } from "../../config/sessions.js";
import { sessionProfiles } from "../../config/sessions.js";
import { env } from "../../config/env.js";
import { logger } from "../../core/logger.js";
import {
  buildGlobalPromptSeed,
  buildSessionPromptSeed,
  GLOBAL_PROMPT_TARGET,
  getSessionPromptTarget
} from "./defaults.js";
import { getPromptDb } from "./store.js";

interface PromptRow {
  content: string;
  updatedAt: string;
}

interface ResolvedPromptCacheEntry {
  prompt: string;
  globalUpdatedAt: string;
  sessionUpdatedAt: string;
  fingerprint: string;
  expiresAt: number;
  messagesSinceRefresh: number;
}

const resolvedCache = new Map<string, ResolvedPromptCacheEntry>();

const nowIso = () => new Date().toISOString();
const getChatCacheTtlMs = () => env.PROMPTS_CHAT_CACHE_TTL_SECONDS * 1000;

const invalidateChatCacheForSession = (sessionName: string) => {
  resolvedCache.delete(sessionName);
};

const invalidateChatCacheForAllSessions = () => {
  for (const profile of sessionProfiles) {
    invalidateChatCacheForSession(profile.sessionId);
  }
};

const upsertPrompt = async (targetKey: string, content: string): Promise<PromptRow> => {
  const db = await getPromptDb();
  const updatedAt = nowIso();

  await db.execute({
    sql: `
      INSERT INTO prompt_current (target_key, content, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(target_key)
      DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at
    `,
    args: [targetKey, content, updatedAt]
  });

  return { content, updatedAt };
};

const getPromptFromDb = async (targetKey: string): Promise<PromptRow | null> => {
  const db = await getPromptDb();
  const result = await db.execute({
    sql: `
      SELECT content, updated_at as updatedAt
      FROM prompt_current
      WHERE target_key = ?
      LIMIT 1
    `,
    args: [targetKey]
  });

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0] as { content?: string; updatedAt?: string };
  return {
    content: String(row.content ?? ""),
    updatedAt: String(row.updatedAt ?? "")
  };
};

const getPromptFresh = async (targetKey: string): Promise<PromptRow> => {
  const row = await getPromptFromDb(targetKey);
  if (!row) {
    throw new Error(`No existe prompt para target ${targetKey}`);
  }
  return row;
};

const ensurePrompt = async (targetKey: string, content: string): Promise<void> => {
  const current = await getPromptFromDb(targetKey);
  if (current) {
    return;
  }
  await upsertPrompt(targetKey, content);
};

const getPromptFingerprint = async (sessionName: string): Promise<string> => {
  const db = await getPromptDb();
  const sessionTarget = getSessionPromptTarget(sessionName);
  const result = await db.execute({
    sql: `
      SELECT target_key, updated_at
      FROM prompt_current
      WHERE target_key IN (?, ?)
      ORDER BY target_key ASC
    `,
    args: [GLOBAL_PROMPT_TARGET, sessionTarget]
  });

  return result.rows
    .map((row: unknown) => {
      const record = row as { target_key?: string; updated_at?: string };
      const targetKey = String(record.target_key ?? "");
      const updatedAt = String(record.updated_at ?? "");
      return `${targetKey}:${updatedAt}`;
    })
    .join("|");
};

export const initializePromptStore = async (): Promise<void> => {
  await ensurePrompt(GLOBAL_PROMPT_TARGET, buildGlobalPromptSeed());

  for (const profile of sessionProfiles) {
    await ensurePrompt(getSessionPromptTarget(profile.sessionId), buildSessionPromptSeed(profile));
  }

  logger.info(
    { totalSessions: sessionProfiles.length },
    "Prompt store inicializado en Turso (modo estricto, prompt unico)"
  );
};

export const getGlobalPromptFresh = async (): Promise<PromptRow> => {
  return getPromptFresh(GLOBAL_PROMPT_TARGET);
};

export const getSessionPromptFresh = async (sessionName: string): Promise<PromptRow> => {
  return getPromptFresh(getSessionPromptTarget(sessionName));
};

export const updateGlobalPrompt = async (content: string): Promise<PromptRow> => {
  const updated = await upsertPrompt(GLOBAL_PROMPT_TARGET, content);
  invalidateChatCacheForAllSessions();
  return updated;
};

export const updateSessionPrompt = async (sessionName: string, content: string): Promise<PromptRow> => {
  const targetKey = getSessionPromptTarget(sessionName);
  const updated = await upsertPrompt(targetKey, content);
  invalidateChatCacheForSession(sessionName);
  return updated;
};

const resolvePromptFromDb = async (sessionName: string): Promise<{
  prompt: string;
  globalUpdatedAt: string;
  sessionUpdatedAt: string;
}> => {
  const globalPrompt = await getGlobalPromptFresh();
  const sessionPrompt = await getSessionPromptFresh(sessionName);

  return {
    prompt: `${globalPrompt.content}\n\n${sessionPrompt.content}`,
    globalUpdatedAt: globalPrompt.updatedAt,
    sessionUpdatedAt: sessionPrompt.updatedAt
  };
};

export const resolvePromptForSessionFresh = async (
  sessionName: string
): Promise<{
  prompt: string;
  globalUpdatedAt: string;
  sessionUpdatedAt: string;
}> => {
  return resolvePromptFromDb(sessionName);
};

export const resolvePromptForSession = async (
  sessionName: string,
  sessionProfile?: SessionStoreProfile
): Promise<{
  prompt: string;
  globalUpdatedAt: string;
  sessionUpdatedAt: string;
}> => {
  const current = resolvedCache.get(sessionName);
  const now = Date.now();
  const maxMessages = Math.max(1, env.PROMPTS_CHAT_CACHE_MAX_MESSAGES);

  if (current && current.expiresAt > now && current.messagesSinceRefresh < maxMessages) {
    current.messagesSinceRefresh += 1;
    return {
      prompt: current.prompt,
      globalUpdatedAt: current.globalUpdatedAt,
      sessionUpdatedAt: current.sessionUpdatedAt
    };
  }

  try {
    const fingerprint = await getPromptFingerprint(sessionName);

    if (current && current.expiresAt > now && current.fingerprint === fingerprint) {
      current.expiresAt = now + getChatCacheTtlMs();
      current.messagesSinceRefresh = 1;
      return {
        prompt: current.prompt,
        globalUpdatedAt: current.globalUpdatedAt,
        sessionUpdatedAt: current.sessionUpdatedAt
      };
    }

    const resolved = await resolvePromptFromDb(sessionName);
    resolvedCache.set(sessionName, {
      ...resolved,
      fingerprint,
      expiresAt: now + getChatCacheTtlMs(),
      messagesSinceRefresh: 1
    });

    return resolved;
  } catch (error) {
    logger.warn({ error, sessionName }, "Fallback a prompt embebido por falla de Turso");

    if (!sessionProfile) {
      throw error;
    }

    return {
      prompt: `${buildGlobalPromptSeed()}\n\n${buildSessionPromptSeed(sessionProfile)}`,
      globalUpdatedAt: "seed",
      sessionUpdatedAt: "seed"
    };
  }
};

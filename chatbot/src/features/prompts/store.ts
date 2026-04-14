import { createClient, type Client } from "@libsql/client";
import { env } from "../../config/env.js";

let client: Client | null = null;
let schemaReady = false;
let migrationAttempted = false;

const nowIso = () => new Date().toISOString();

const isTursoConfigured = (): boolean => {
  const url = env.TURSO_DATABASE_URL;
  return Boolean(url && url.startsWith("libsql://"));
};

const ensureClient = (): Client => {
  if (client) {
    return client;
  }

  if (isTursoConfigured()) {
    client = createClient({
      url: env.TURSO_DATABASE_URL,
      authToken: env.TURSO_AUTH_TOKEN
    });
  } else {
    // Fallback: SQLite local (no requiere cuenta Turso)
    client = createClient({ url: "file:./prompts.db" });
  }

  return client;
};

const tableExists = async (db: Client, tableName: string): Promise<boolean> => {
  const result = await db.execute({
    sql: "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1",
    args: [tableName]
  });

  return result.rows.length > 0;
};

const createSchema = async (db: Client): Promise<void> => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS prompt_current (
      target_key TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
};

const migrateFromVersionedSchema = async (db: Client): Promise<void> => {
  if (migrationAttempted) {
    return;
  }
  migrationAttempted = true;

  const hasPromptVersions = await tableExists(db, "prompt_versions");
  if (!hasPromptVersions) {
    return;
  }

  const existingCurrent = await db.execute("SELECT 1 FROM prompt_current LIMIT 1");
  if (existingCurrent.rows.length > 0) {
    return;
  }

  await db.execute(`
    INSERT INTO prompt_current (target_key, content, updated_at)
    SELECT
      targets.target_key,
      COALESCE(active.content, latest.content) AS content,
      COALESCE(active.updated_at, latest.created_at, '${nowIso()}') AS updated_at
    FROM (
      SELECT DISTINCT target_key
      FROM prompt_versions
    ) targets
    LEFT JOIN (
      SELECT pa.target_key, pv.content, pa.updated_at
      FROM prompt_active pa
      JOIN prompt_versions pv
        ON pa.target_key = pv.target_key
       AND pa.version = pv.version
    ) active
      ON active.target_key = targets.target_key
    LEFT JOIN (
      SELECT pv.target_key, pv.content, pv.created_at
      FROM prompt_versions pv
      JOIN (
        SELECT target_key, MAX(version) AS version
        FROM prompt_versions
        GROUP BY target_key
      ) latest
        ON latest.target_key = pv.target_key
       AND latest.version = pv.version
    ) latest
      ON latest.target_key = targets.target_key
    WHERE COALESCE(active.content, latest.content) IS NOT NULL
    ON CONFLICT(target_key) DO NOTHING
  `);
};

const ensureSchemaReady = async (): Promise<Client> => {
  const db = ensureClient();

  if (schemaReady) {
    return db;
  }

  await createSchema(db);
  await migrateFromVersionedSchema(db);
  schemaReady = true;

  return db;
};

export const getPromptDb = async (): Promise<Client> => {
  return ensureSchemaReady();
};

// Database access is now handled via PostgREST HTTP endpoints (src/shared/api/)

export async function initDatabase(): Promise<void> {
  // No-op: database initialization handled by PostgREST server
}

export async function initDatabaseAndModels(): Promise<void> {
  // No-op: database initialization handled by PostgREST server
}

export function getDatabase(): null {
  return null;
}

export async function closeDatabase(): Promise<void> {
  // No-op
}

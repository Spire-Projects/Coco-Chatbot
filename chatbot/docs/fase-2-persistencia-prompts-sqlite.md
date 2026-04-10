# Fase 2 - Persistencia de prompts en SQLite

## Objetivo
Crear almacenamiento versionado de prompts con SQLite como fuente principal.

## Implementado
- Se agrego capa SQLite con better-sqlite3.
- Se crearon tablas:
  - prompt_versions
  - prompt_active
- Se agrego inicializacion automatica de esquema y seeds.
- Seeds iniciales:
  - prompt global compartido
  - prompt especifico por sesion
- Se agrego cache en memoria con TTL para lecturas.
- Se implemento fallback a prompt embebido si SQLite falla.

## Archivos
- src/features/prompts/store.ts
- src/features/prompts/defaults.ts
- src/features/prompts/service.ts
- src/config/env.ts

## Variables nuevas
- API_PORT
- PROMPTS_DB_PATH
- PROMPTS_CACHE_SECONDS

## Resultado
El sistema ya maneja prompts versionados y activos por target (global/session) sobre SQLite.

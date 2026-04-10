# Fase 4 - API REST para prompts con Express

## Objetivo
Exponer endpoints libres para consultar, versionar y publicar prompts sin redeploy.

## Implementado
- Se monto servidor Express en el mismo proceso Node.
- Se agrego healthcheck basico.
- Se agregaron endpoints:
  - GET /api/prompts/global
  - GET /api/prompts/global/versions
  - PUT /api/prompts/global
  - POST /api/prompts/global/publish
  - GET /api/prompts/sessions/:sessionName
  - GET /api/prompts/sessions/:sessionName/versions
  - PUT /api/prompts/sessions/:sessionName
  - POST /api/prompts/sessions/:sessionName/publish
  - GET /api/prompts/resolved/:sessionName
- Se agregaron validaciones:
  - sessionName permitido
  - content no vacio
  - limite de longitud
  - version numerica positiva
- Se integro arranque de API en bootstrap principal.

## Archivos
- src/features/prompts/routes.ts
- src/features/prompts/server.ts
- src/app.ts

## Resultado
Prompts editables y publicables en caliente por API REST, sin detener el bot.

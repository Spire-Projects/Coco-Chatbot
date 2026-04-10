# Fase 6 - API de sesiones y SSE en tiempo real

## Objetivo
Exponer el estado de las 3 sesiones WhatsApp y transmitir actualizaciones de estado/QR en vivo para el panel admin.

## Implementado
- Se agrego un estado runtime publico por sesion.
- Se capturan y sincronizan cambios desde Baileys:
  - starting
  - waiting_qr
  - connected
  - reconnecting
  - disconnected
- Se guarda QR crudo por sesion cuando existe.
- Se agregaron endpoints de sesiones:
  - GET /api/sessions
  - GET /api/sessions/:sessionName
  - GET /api/sessions/:sessionName/connection
- Se agrego SSE por sesion:
  - GET /api/sessions/:sessionName/events
  - eventos: session_state, session_qr, heartbeat
- Se agrego CORS abierto temporal para integrar el frontend admin.

## Archivos
- src/features/sessions/runtime.ts
- src/features/sessions/routes.ts
- src/core/whatsapp/client.ts
- src/features/prompts/server.ts

## Resultado
El backend reporta estado de palma-real, paseo-aranjuez y tarija, y entrega QR en vivo por SSE cuando corresponde.

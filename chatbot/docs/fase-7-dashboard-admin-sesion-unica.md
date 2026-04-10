# Fase 7 - Dashboard admin en vista unica con selector

## Objetivo
Construir una interfaz admin para operar sesiones y prompts desde una sola pantalla.

## Implementado
- Se reemplazo el boilerplate por dashboard funcional.
- Vista unica con selector de sesion:
  - palma-real
  - paseo-aranjuez
  - tarija
- Panel de estado de sesion:
  - estado actual
  - intentos de reconexion
  - ultimo codigo de desconexion
  - informacion de sucursal y vendedores
- Panel QR:
  - render de QR desde string crudo
  - actualizacion automatica por SSE
- Panel de prompts:
  - edicion global
  - edicion por sesion
  - crear version y publicar
  - publicar versiones historicas
- Se agrego cliente API y hook SSE reutilizable.

## Archivos
- admin-chatbot/src/App.tsx
- admin-chatbot/src/App.css
- admin-chatbot/src/shared/api.ts
- admin-chatbot/src/shared/useSessionEvents.ts
- admin-chatbot/src/features/sessions/types.ts
- admin-chatbot/src/features/sessions/SessionSelector.tsx
- admin-chatbot/src/features/sessions/SessionStatusPanel.tsx
- admin-chatbot/src/features/qr/QrPanel.tsx
- admin-chatbot/src/features/prompts/PromptEditorPanel.tsx

## Resultado
El panel admin opera en vista unica por sesion y responde en tiempo real a cambios de conexion y QR.

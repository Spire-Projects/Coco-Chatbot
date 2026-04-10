# Fase 9 - Modo Prompt-Only (Opcion A)

## Objetivo
Asegurar que el bot y la UI se basen solo en prompts editables, sin mezclar datos estaticos de sesion para contenido comercial.

## Cambios backend
- Se retiro inyeccion de contexto runtime de sesion en la generacion de respuesta IA.
- Se retiro handoff estatico con datos de agentes/ubicacion de sessions.ts.
- La respuesta IA queda basada en:
  - prompt global activo
  - prompt de sesion activo
  - contexto de catalogo y memoria conversacional

## Archivos backend
- src/features/sales-assistant/gemini.ts
- src/features/sales-assistant/handler.ts

## Cambios frontend
- Se simplifico panel de estado para mostrar solo:
  - conectado
  - desconectado
- Se elimino render de detalles de sesion y vendedores.
- Se simplifico panel de prompts:
  - 2 fields (global + sesion)
  - sin listado de historial visible

## Archivos frontend
- admin-chatbot/src/features/sessions/SessionStatusPanel.tsx
- admin-chatbot/src/features/prompts/PromptEditorPanel.tsx
- admin-chatbot/src/App.tsx

## Resultado
El comportamiento visible y de generacion se alinea al modelo prompt-only solicitado.

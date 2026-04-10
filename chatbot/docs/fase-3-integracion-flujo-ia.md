# Fase 3 - Integracion al flujo de IA

## Objetivo
Reemplazar prompt hardcodeado por composicion dinamica Global + Sesion por cada respuesta.

## Implementado
- Gemini ahora resuelve prompt por sesion desde PromptService.
- Se compone prompt final como:
  - prompt global activo
  - prompt especifico activo de la sesion
- Se mantiene contexto runtime (telefono, direccion, horario, agentes) para robustez.
- Se agrega logging de version de prompt usada en cada generacion.

## Archivos
- src/features/sales-assistant/gemini.ts

## Resultado
Cada sesion responde con su identidad/comercializacion propia, compartiendo base global comun.

# Fase 1 - Sesiones con nombre legible

## Objetivo
Migrar la operacion de sesiones de WhatsApp a nombres funcionales sin perder compatibilidad con carpetas auth existentes.

## Implementado
- Se definieron nombres canonicos de sesion:
  - palma-real
  - paseo-aranjuez
  - tarija
- Se agrego authDirName por perfil para mantener mapeo con carpetas legacy de /auth.
- Se habilito seleccion de sesiones por selector mixto:
  - nombre canonico (nuevo)
  - id legacy de auth (retrocompatibilidad)
- Se mejoro logging de inicio:
  - activeSessionIds (nombres)
  - activeAuthDirs (carpetas reales)
  - unknownSelectors

## Archivos
- src/config/sessions.ts
- src/core/whatsapp/client.ts
- .env
- .env.example

## Resultado
La app puede operar con nombres de sesion en configuracion y conservar credenciales existentes sin re-escanear QR.

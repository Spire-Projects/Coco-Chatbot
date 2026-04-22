---
description: "Agente especialista en Coco Chatbot. Usar cuando se necesite: modificar el bot de directorio de empresas, entender el flujo de mensajes WhatsApp con Meta API, editar el prompt del asistente, configurar Google Sheets como fuente de datos, conectar con yCloud o Meta WhatsApp Business, desplegar el servidor, o diagnosticar errores del chatbot."
name: "Coco Chatbot Agent"
tools: [read, edit, search, execute]
---

Eres el agente especialista de **Coco Chatbot**, un chatbot de WhatsApp que funciona como directorio de empresas y servicios impulsado por Google Gemini AI.

## Qué hace Coco Chatbot

- Recibe mensajes de WhatsApp a través de la **Meta WhatsApp Business Cloud API** (o yCloud como intermediario)
- Consulta un **Google Sheets público** con el catálogo de empresas del cliente
- Usa **Google Gemini AI** para entender la consulta y responder de forma natural
- Pregunta el departamento/ciudad al usuario para filtrar resultados relevantes
- Permite editar el prompt del bot desde un **panel HTML** en `http://localhost:3100/admin`

## Arquitectura del proyecto

```
Coco-Chatbot/chatbot/src/
├── app.ts                          # Entry point
├── config/
│   ├── env.ts                      # Variables de entorno tipadas
│   └── sessions.ts                 # Configuracion de sesion (sessionId: "main")
├── core/
│   ├── logger.ts                   # Logger Pino
│   └── whatsapp/
│       ├── sender.ts               # Envia mensajes via Meta API
│       └── webhook.ts              # Recibe mensajes (GET verificacion + POST mensajes)
└── features/
    ├── prompts/
    │   ├── defaults.ts             # Prompt base del bot (EDITAR AQUI el comportamiento)
    │   ├── routes.ts               # API REST GET/PUT para prompts
    │   ├── server.ts               # Express server + panel HTML /admin
    │   ├── service.ts              # Logica de prompts con cache
    │   └── store.ts                # SQLite local (o Turso si configurado)
    └── sales-assistant/
        ├── catalog.ts              # Lee Google Sheets + cache 2 min
        ├── gemini.ts               # Construye prompt + llama Gemini
        ├── handler.ts              # Orquesta: catalogo + Gemini + respuesta
        ├── intent.ts               # Detecta intencion (query/comparison)
        ├── memory.ts               # Historial de conversacion con TTL
        └── types.ts                # CatalogItem, ConversationMemory
```

## Variables de entorno requeridas (.env)

```
META_ACCESS_TOKEN=        # Token permanente de Meta o yCloud
META_PHONE_NUMBER_ID=     # ID del numero de WhatsApp
META_WEBHOOK_VERIFY_TOKEN=coco_verify_token_secreto
GEMINI_API_KEY=           # API key de Google AI Studio
SHEETS_SPREADSHEET_ID=    # ID del Google Sheets del cliente
SHEETS_SHEET_NAME=Hoja1
SHEETS_RANGE=A1:H
```

## Estructura esperada del Google Sheets

Columnas A-H sin fila de encabezado (o con encabezado, el catalogo filtra vacíos):
| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| # | Nombre empresa | Tipo/Rubro | Descripcion | Ubicacion/Ciudad | Contacto/Tel | Horario | Info extra |

## Comandos

```bash
# Desarrollo (desde Coco-Chatbot/chatbot/)
npm run dev

# Panel de administracion del prompt
http://localhost:3100/admin

# Webhook para Meta/yCloud
http://localhost:3100/webhook
```

## Cómo responde el bot (flujo)

1. Usuario escribe al número de WhatsApp
2. Meta/yCloud envía un POST a `/webhook`
3. `handler.ts` extrae el texto, consulta Google Sheets y llama a Gemini
4. Gemini responde usando el prompt del admin + datos del directorio
5. `sender.ts` envía la respuesta vía Meta/yCloud API

## Reglas al modificar

- Para cambiar el **comportamiento del bot**: editar `features/prompts/defaults.ts` → `buildGlobalPromptSeed()`
- Para cambiar **columnas del Excel**: editar `features/sales-assistant/catalog.ts` → `toEmpresaItem()` y `types.ts`
- Para cambiar **formato de respuesta**: editar `features/sales-assistant/gemini.ts` → `formatCatalogLine()`
- Siempre correr `npx tsc --noEmit` antes de hacer commit

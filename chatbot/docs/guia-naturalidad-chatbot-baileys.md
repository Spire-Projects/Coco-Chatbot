# Guia de naturalidad conversacional en chatbot (Baileys)

## Objetivo
Documentar las practicas ya implementadas en el chatbot para que la experiencia de conversacion se perciba mas natural en WhatsApp.

## Alcance
- Solo incluye comportamientos actualmente implementados en codigo.
- No incluye roadmap, mejoras futuras ni recomendaciones de arquitectura.
- Cubre flujo de entrada, generacion, respuesta, memoria y resiliencia operativa.

## Practicas implementadas

### 1) Simulacion de tipeo antes de responder
Que hace:
- Muestra estado de "escribiendo" antes de enviar el mensaje final.

Implementacion:
- Archivo: src/features/sales-assistant/human-simulation.ts
- Funcion principal: respondWithHumanSimulation(sock, jid, messageText)
- Flujo:
  1. sendPresenceUpdate("composing", jid)
  2. espera delay calculado
  3. sendPresenceUpdate("paused", jid)
  4. sendMessage(jid, { text })

Efecto en naturalidad:
- Evita respuestas instantaneas tipo bot.
- Da una senal visual esperada en un chat humano.

### 2) Delay dinamico segun longitud del texto
Que hace:
- Ajusta el tiempo de espera antes de responder en funcion del tamano de la respuesta.

Implementacion:
- Archivo: src/features/sales-assistant/human-simulation.ts
- Funcion: calculateDelay(textLength)
- Regla:
  - baseDelay = textLength * 30 ms
  - limites: minimo 1500 ms, maximo 8000 ms

Efecto en naturalidad:
- Mensajes cortos responden rapido.
- Mensajes largos no salen de forma antinaturalmente inmediata.

### 3) Jitter aleatorio en tiempo de respuesta
Que hace:
- Introduce variacion aleatoria en el delay para evitar un patron fijo.

Implementacion:
- Archivo: src/features/sales-assistant/human-simulation.ts
- Logica: jitter de +/-400 ms sobre el delay base.

Efecto en naturalidad:
- Reduce cadencia mecanica.
- Evita que todas las respuestas tengan timing exacto repetitivo.

### 4) Batching + debounce de mensajes entrantes
Que hace:
- Si el cliente manda varios mensajes seguidos, se consolidan y se procesa una respuesta unica.

Implementacion:
- Archivo: src/core/whatsapp/events.ts
- Estructura: pendingBatches (por sessionId + jid)
- Timers:
  - idle timer: MESSAGE_BATCH_WINDOW_MS
  - max wait: MESSAGE_BATCH_MAX_WAIT_MS
- Consolidacion: join("\n") de los textos del lote.

Efecto en naturalidad:
- Evita respuestas fragmentadas por cada mensaje corto.
- Replica mejor el comportamiento de un asesor que lee todo y responde una sola vez.

### 5) Memoria conversacional por sesion y contacto
Que hace:
- Mantiene contexto del hilo para no responder "desde cero" en cada turno.

Implementacion:
- Archivo: src/features/sales-assistant/memory.ts
- Scope: clave compuesta sessionId:jid
- Datos guardados:
  - turns (historial)
  - lastIntent
  - productsMentioned
  - budgetUsd
- Politicas:
  - TTL: MEMORY_TTL_MINUTES
  - maximo de turns: 12

Integracion de flujo:
- Archivo: src/features/sales-assistant/handler.ts
- Se agrega turno de usuario y turno de asistente despues de cada respuesta.

Efecto en naturalidad:
- Permite continuidad tematica.
- Evita repetir preguntas ya contestadas por el cliente.

### 6) Deteccion de intencion de compra/comparacion/consulta
Que hace:
- Clasifica mensaje del cliente para ajustar comportamiento del flujo.

Implementacion:
- Archivo: src/features/sales-assistant/intent.ts
- Intenciones:
  - close (palabras de cierre/compra)
  - comparison (palabras de comparacion)
  - query (fallback)

Integracion:
- Archivo: src/features/sales-assistant/handler.ts
- Uso: detectIntent(incomingText)

Efecto en naturalidad:
- Cambia tono y accion segun fase de conversacion.
- Permite transicionar a cierre de forma coherente.

### 7) Handoff humano en cierre o error operativo
Que hace:
- En escenarios de cierre o fallo, la conversacion puede derivar a agente humano.

Implementacion:
- Archivo: src/features/sales-assistant/handler.ts
- Casos actuales:
  - intent == "close": limpia memoria de esa conversacion
  - catch del flujo comercial: mensaje de fallback ofreciendo agente

Efecto en naturalidad:
- Evita forzar automatizacion en etapas sensibles de compra.
- Mantiene continuidad de atencion cuando hay incidentes tecnicos.

### 8) Grounding de respuestas con catalogo real
Que hace:
- La IA responde usando items reales del catalogo en lugar de inventar informacion.

Implementacion:
- Archivo: src/features/sales-assistant/catalog.ts
- Fuente: Google Sheets (hoja de nuevos + hoja de seminuevos)
- Pipeline:
  - lectura de hojas
  - normalizacion/indexado
  - busqueda relevante por scoring

Uso en flujo:
- Archivo: src/features/sales-assistant/handler.ts
- Funciones: getCatalogItems() y findRelevantCatalogItems(...)

Efecto en naturalidad:
- Respuestas mas concretas y comercialmente utiles.
- Menor riesgo de datos ficticios en precio/estado.

### 9) Timeout, cache y deduplicacion de requests al catalogo
Que hace:
- Hace robusta la lectura de catalogo ante latencia o fallas externas.

Implementacion:
- Archivo: src/features/sales-assistant/catalog.ts
- Controles:
  - timeout de request: 8000 ms (AbortController)
  - cache en memoria: SHEETS_CACHE_SECONDS
  - inflightCatalogRequest para evitar requests concurrentes duplicados
  - fallback a cache previa cuando hay error de fetch

Efecto en naturalidad:
- Reduce caidas visibles en tiempo de respuesta.
- Evita pausas largas o comportamiento erratico por dependencias externas.

### 10) Seleccion semantica de items relevantes
Que hace:
- Puntua productos por coincidencia textual para enviar a IA solo lo mas pertinente.

Implementacion:
- Archivo: src/features/sales-assistant/catalog.ts
- Funcion: findRelevantCatalogItems(items, query, maxItems = 8)
- Matching por campos (producto/categoria/color/estado/precio y metadatos seminuevos).

Efecto en naturalidad:
- Respuestas enfocadas al pedido actual del cliente.
- Menos ruido en la generacion.

### 11) Prompt compuesto con contexto temporal y memoria reciente
Que hace:
- En cada generacion, incluye contexto de hora local, memoria y catalogo relevante.

Implementacion:
- Archivo: src/features/sales-assistant/gemini.ts
- Componentes del prompt:
  - intencion actual
  - hora Bolivia (America/La_Paz)
  - mensaje del cliente
  - total de catalogo
  - bloque de catalogo relevante (NUEVOS/SEMINUEVOS)
  - memoria de conversacion (ultimos 6 turnos)

Reglas del system prompt:
- "no inventes productos, precios, estado o garantia"
- "si falta informacion, dilo"
- "si la intencion es cierre, llamado a accion con humano"

Efecto en naturalidad:
- Mejora coherencia entre turnos.
- Mantiene respuestas situadas en contexto comercial y horario real.

### 12) Reconexion con backoff exponencial en canal WhatsApp
Que hace:
- Si se corta la conexion, reintenta con esperas crecientes hasta un tope.

Implementacion:
- Archivo: src/core/whatsapp/client.ts
- Funcion: computeReconnectDelayMs(attempt)
- Regla actual: tope de 20000 ms.

Efecto en naturalidad:
- Reduce interrupciones prolongadas de atencion.
- Evita reconexiones agresivas que desestabilicen la sesion.

## Flujo resumido de naturalidad
1. Llega mensaje de WhatsApp.
2. events.ts lo agrega a lote (debounce/batching).
3. handler.ts detecta intencion, recupera memoria y consulta catalogo.
4. gemini.ts construye prompt con contexto real.
5. human-simulation.ts aplica typing + delay + jitter.
6. Se envia respuesta y se persiste el nuevo estado conversacional.

## Limites actuales observables (estado actual)
- La variacion de estilo depende principalmente del modelo IA y del prompt activo.
- El estado de presencia (composing/paused) es best effort: si falla, el envio continua.
- La limpieza de memoria expirada ocurre al acceder/actualizar memoria (estrategia lazy).

## Archivos clave de referencia
- src/core/whatsapp/events.ts
- src/core/whatsapp/client.ts
- src/features/sales-assistant/human-simulation.ts
- src/features/sales-assistant/handler.ts
- src/features/sales-assistant/intent.ts
- src/features/sales-assistant/memory.ts
- src/features/sales-assistant/catalog.ts
- src/features/sales-assistant/gemini.ts

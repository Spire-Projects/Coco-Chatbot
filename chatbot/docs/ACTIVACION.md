# Coco Chatbot — Guía de activación completa

## ¿Qué es yCloud y por qué usarlo?

**yCloud** ([ycloud.com](https://www.ycloud.com)) es una plataforma que actúa como **intermediario oficial entre tu bot y Meta WhatsApp Business API**.

### Sin yCloud
```
Tu servidor → Meta API directamente
(Requiere cuenta Business verificada, proceso de 2-4 semanas)
```

### Con yCloud
```
Tu servidor → yCloud API → Meta API → WhatsApp del usuario
(Proceso simplificado, yCloud ya tiene los permisos aprobados)
```

**yCloud hace la verificación de negocio con Meta en tu lugar.** Por eso Fabián dice que "mañana le pedirá que hagan la verificación" — yCloud gestiona eso con los datos del cliente.

---

## Lo que necesitas del cliente (checklist)

- [ ] Número de teléfono dedicado para el bot (puede ser línea nueva o la del negocio)
- [ ] Nombre legal del negocio
- [ ] NIT o documento de identidad del negocio
- [ ] Cuenta de Facebook (para crear el Business Manager)
- [ ] Google Sheets con el directorio de empresas (compartido como público, solo lectura)

---

## Paso a paso — Activación completa

### PASO 1 — Crear cuenta en yCloud

1. Ir a [ycloud.com](https://www.ycloud.com) → **Sign Up**
2. Crear cuenta con el email del negocio
3. Una vez dentro: **WhatsApp** → **Phone Numbers** → **Add Number**

### PASO 2 — Registrar el número en yCloud

1. Ingresar el número de teléfono del cliente
2. yCloud enviará un **código OTP** al número (por SMS o llamada)
3. Ingresar el código para verificar
4. yCloud registra el número en Meta automáticamente

> ⚠️ **Importante:** Una vez registrado en yCloud/Meta, el número deja de recibir mensajes normales en la app de WhatsApp en ese teléfono. Si el cliente quiere seguir usándolo también en su teléfono, avisar antes.

### PASO 3 — Verificación de negocio en Meta (lo hace yCloud)

yCloud guía este proceso. Necesitan:
- Nombre del negocio
- País
- NIT o número de registro empresarial
- Sitio web (si tienen) o perfil de Facebook/Instagram

Meta tarda entre **1 y 5 días hábiles** en aprobar. El estado aparece en el panel de yCloud.

### PASO 4 — Obtener credenciales de yCloud

Una vez aprobado, en yCloud:
1. **Settings** → **API Keys** → copiar el **API Key**
2. **WhatsApp** → **Phone Numbers** → copiar el **Phone Number ID**

Estos van en el `.env` del bot:
```
META_ACCESS_TOKEN=API_KEY_DE_YCLOUD
META_PHONE_NUMBER_ID=PHONE_NUMBER_ID_DE_YCLOUD
META_API_VERSION=v2   # yCloud usa su propia versión de la API
```

> yCloud es compatible con la Meta Cloud API. Los endpoints son casi iguales pero cambia la URL base. Verificar en la documentación de yCloud si el endpoint es `api.ycloud.com` en lugar de `graph.facebook.com`.

### PASO 5 — Desplegar el servidor del bot

El bot necesita una URL pública HTTPS. Opciones:

#### Opción A — Railway (recomendado, gratis para empezar)
1. Ir a [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Seleccionar el repo `Coco-Chatbot`, directorio `chatbot/`
3. Agregar todas las variables de entorno del `.env`
4. Railway genera automáticamente una URL HTTPS como `https://coco-chatbot-xxx.railway.app`

#### Opción B — Render
1. Ir a [render.com](https://render.com) → New Web Service
2. Conectar el repo, directorio `chatbot/`
3. Build command: `npm install && npm run build`
4. Start command: `npm start`

#### Opción C — Desarrollo local con ngrok (solo para pruebas)
```bash
ngrok http 3100
# Copia la URL HTTPS que aparece: https://xxxx.ngrok.io
```

### PASO 6 — Configurar el Webhook en yCloud

1. En yCloud: **WhatsApp** → **Webhooks** → **Add Webhook**
2. URL: `https://TU_SERVIDOR/webhook`
3. Secret/Verify Token: el mismo que en tu `.env` → `META_WEBHOOK_VERIFY_TOKEN=coco_verify_token_secreto`
4. Eventos a suscribir: **messages**
5. Guardar → yCloud hará una llamada GET al webhook para verificarlo

Si el log del bot muestra `"Webhook de Meta verificado correctamente"` → todo OK.

### PASO 7 — Configurar Google Sheets

1. Crear el Google Sheets con las columnas del directorio:

| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| # | Nombre | Tipo/Rubro | Descripción | Ciudad/Dpto | Contacto | Horario | Info extra |

2. Hacer el Sheet **público**:
   - Compartir → **Cualquier persona con el enlace** → **Lector**
3. Copiar el ID del Sheet de la URL:
   ```
   https://docs.google.com/spreadsheets/d/[ESTE_ES_EL_ID]/edit
   ```
4. Pegar en el `.env`:
   ```
   SHEETS_SPREADSHEET_ID=ESTE_ES_EL_ID
   SHEETS_SHEET_NAME=Hoja1
   SHEETS_RANGE=A1:H
   ```

### PASO 8 — Configurar el prompt del bot

El prompt controla cómo responde el bot. Se puede editar en:

**Panel de administración:** `https://TU_SERVIDOR/admin`

Desde ahí el cliente (o tú) puede cambiar el texto del prompt sin tocar código.

---

## Prueba final

1. Enviar un mensaje al número registrado: `"Hola"`
2. El bot debe responder con un saludo y preguntar el departamento
3. Responder con una ciudad: `"Cochabamba"`
4. El bot debe listar empresas del directorio en esa ciudad

---

## Resumen visual del flujo

```
Cliente escribe en WhatsApp
         ↓
   yCloud recibe el mensaje
         ↓
   POST a https://TU_SERVIDOR/webhook
         ↓
   handler.ts procesa el mensaje
         ↓
   catalog.ts lee Google Sheets (con cache 2 min)
         ↓
   gemini.ts llama a Gemini AI con el prompt + datos
         ↓
   sender.ts envía la respuesta vía yCloud API
         ↓
   Cliente recibe la respuesta en WhatsApp
```

---

## Variables de entorno finales (.env)

```env
# yCloud / Meta
META_ACCESS_TOKEN=API_KEY_DE_YCLOUD
META_PHONE_NUMBER_ID=PHONE_NUMBER_ID_DE_YCLOUD
META_WEBHOOK_VERIFY_TOKEN=coco_verify_token_secreto
META_API_VERSION=v21.0

# Gemini AI
GEMINI_API_KEY=AIzaSyAKjbsWynXGL7-o0F-vfihWBwMyG9JdXR0
GEMINI_MODEL=gemini-1.5-flash

# Google Sheets
SHEETS_SPREADSHEET_ID=ID_DEL_SHEET_DEL_CLIENTE
SHEETS_SHEET_NAME=Hoja1
SHEETS_RANGE=A1:H
SHEETS_CACHE_SECONDS=120

# Servidor
API_PORT=3100
MEMORY_TTL_MINUTES=30
TIMEZONE=America/La_Paz
LOG_LEVEL=info
```

---

## Diferencia entre Meta directo vs yCloud

| | **Meta directamente** | **yCloud** |
|---|---|---|
| Tiempo de aprobación | 2-4 semanas | 1-5 días |
| Dificultad | Alta (verificación empresarial directa) | Baja (yCloud la gestiona) |
| Costo | Gratis (pagas por conversación) | Hay un fee de plataforma |
| Coexistence (número en app + bot) | Posible pero complejo | yCloud lo maneja |
| Cambiar código del bot | Cambia URL endpoint | Igual, solo cambia base URL |

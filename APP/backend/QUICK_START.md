# ✅ Iniciar Backend con PostgREST + AWS RDS PostgreSQL

## ⚡ Inicio Rápido con Docker Compose (Recomendado)

```bash
docker compose up -d
```

Verificar estado:

```bash
docker compose ps
docker compose logs -f postgrest
```

Detener:

```bash
docker compose down
```

## 🔧 Configuración Previa

### 1. Copiar y Actualizar Variables de Entorno
```bash
copy .env.example .env
```

Las credenciales de AWS RDS ya están configuradas en `.env`:
- Host: `appleland.cbusqiwsy85i.us-east-2.rds.amazonaws.com`
- Usuario: `appleladnd`
- Password: `Programador12pam`

### 2. Instalar Dependencias
```bash
npm install
```

---

## 🚀 Iniciar PostgREST (Alternativas)

### Opción 1: Instalación Global de PostgREST (Recomendado)

#### Windows Manual:
1. Descargar desde: https://postgrest.org/en/latest/admin-ui/index.html
2. Descomprimir y copiar `postgrest.exe` a `backend/bin/`
3. Ejecutar: `\.\bin\postgrest.exe postgrest.conf`

#### Windows con Docker (sin instalar PostgREST local):
```bash
docker run --rm --name postgrest -p 3000:3000 \
	-e PGRST_DB_URI="postgres://appleladnd:Programador12%3F%23@appleland.cbusqiwsy85i.us-east-2.rds.amazonaws.com:5432/postgres" \
	-e PGRST_DB_SCHEMA="public" \
	-e PGRST_DB_ANON_ROLE="web_anon" \
	-e PGRST_JWT_SECRET="your-secret-key-change-in-production" \
	postgrest/postgrest
```

### Opción 2: Usando npm (Wrapper)
```bash
npm start
```

---

## ✅ Verificar Conexión

### 1. Probar conexión a BD
```bash
node db-connection.js
```

Deberías ver:
```
✅ Database connected successfully!
PostgreSQL version: PostgreSQL 16...
```

### 2. Probar PostgREST API
```bash
curl http://localhost:3000
```

Deberías ver:
```
{"version":"...","name":"PostgREST","description":"..."}
```

---

## 🧪 Endpoints de Ejemplo

Si PostgREST está corriendo en puerto 3000:

```bash
# Listar usuarios
curl http://localhost:3000/users

# Listar productos
curl http://localhost:3000/products

# Listar sucursales
curl http://localhost:3000/branches

# Listar categorías
curl http://localhost:3000/categories

# Listar clientes
curl http://localhost:3000/customers
```

---

## 🔑 Credenciales AWS

Si necesitas conectarte directamente a la BD con pgAdmin o SQL Client:

```
Servidor: appleland.cbusqiwsy85i.us-east-2.rds.amazonaws.com
Puerto: 5432
Usuario: appleladnd
Contraseña: Programador12pam
Base de Datos: postgres
SSL: Requerido
```

---

## 📝 Próximas Tareas

1. [ ] Ejecutar setup de auth en PostgreSQL
2. [ ] Probar endpoint `POST /rpc/login`
3. [ ] Implementar Row Level Security (RLS)
4. [ ] Conectar frontend a API PostgREST
5. [ ] Crear usuario de prueba

---

## 🔐 Setup Login JWT (PostgreSQL + PostgREST)

Ejecuta estos scripts en este orden dentro de tu RDS:

```sql
\i sql/schema.sql
\i sql/init.sql
\i sql/auth.sql
```

`auth.sql` ya usa una tabla privada (`app.private_settings`) para guardar el secreto JWT, asi que no necesitas `ALTER DATABASE` en RDS.
El secreto debe coincidir con `JWT_SECRET` en `.env` y `jwt-secret` en `postgrest.conf`.

Reinicia PostgREST:

```bash
docker compose up -d
docker compose restart postgrest
```

Crear usuario de prueba con password hasheado:

```sql
INSERT INTO users (name, email, password_hash, role, is_active, is_deleted)
VALUES (
	'Admin Test',
	'admin@appleland.com',
	app.hash_password('123456'),
	'admin',
	true,
	false
);
```

Probar login:

```bash
curl -X POST http://localhost:3000/rpc/login \
	-H "Content-Type: application/json" \
	-d '{"p_email":"admin@appleland.com","p_password":"123456"}'
```

Si todo esta bien, recibes `{ token, token_type, expires_in, user }`.

Registrar usuario (solo autenticado con rol web_user):

```bash
curl -X POST http://localhost:3000/rpc/register_user \
	-H "Content-Type: application/json" \
	-H "Authorization: Bearer TU_TOKEN_JWT" \
	-d '{"p_name":"Vendedor 1","p_email":"seller1@appleland.com","p_password":"123456","p_role":"seller"}'
```

Recomendacion:

- No insertar usuarios directo desde frontend en la tabla users.
- No hashear password en frontend.
- Usa RPC app.register_user para que el hash bcrypt se genere en PostgreSQL.

---

## ❓ Troubleshooting

### Error: "No database connection"
- Verificar `.env` tiene credenciales correctas
- Verificar que AWS RDS esté disponible
- Comprobar firewall/VPN

### Error: "Schema not found"
- Ejecutar el script de schema: `sql/schema.sql`
- Verificar permisos en la BD

### Error: "Port 3000 already in use"
- Cambiar puerto en `postgrest.conf`: `server-port = 3001`

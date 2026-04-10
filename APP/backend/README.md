# Backend - PostgREST + AWS RDS

Backend API para Apple Land ERP usando PostgREST conexión a AWS RDS PostgreSQL.

## 🏗️ Arquitectura

- **Base de Datos**: AWS RDS PostgreSQL (us-east-2)
- **API Gateway**: PostgREST (Auto-generated REST API)
- **Autenticación**: JWT
- **Runtime**: Node.js + PostgREST CLI

## ⚙️ Configuración

### 1. Variables de Entorno

Copia `.env.example` a `.env`:

```bash
cp .env.example .env
```

Las credenciales de AWS ya están configuradas:
- `DB_HOST`: `appleland.cbusqiwsy85i.us-east-2.rds.amazonaws.com`
- `DB_USER`: `appleladnd`
- `DB_PASSWORD`: `Programador12pam`

### 2. Inicio rápido con Docker Compose (recomendado)

```bash
docker compose up -d
docker compose ps
docker compose logs -f postgrest
```

Detener:

```bash
docker compose down
```

### 3. Instalar Dependencias

```bash
npm install
```

### 4. Instalar PostgREST

Windows manual:

```bash
# Descargar postgrest.exe desde postgrest.org
# Copiarlo a backend/bin
.\bin\postgrest.exe postgrest.conf
```

Alternativa con Docker:

```bash
docker run --rm --name postgrest -p 3000:3000 \
  -e PGRST_DB_URI="postgres://appleladnd:Programador12pam@appleland.cbusqiwsy85i.us-east-2.rds.amazonaws.com:5432/postgres?sslmode=require" \
  -e PGRST_DB_SCHEMA="public" \
  -e PGRST_DB_ANON_ROLE="appleladnd" \
  -e PGRST_JWT_SECRET="your-secret-key-change-in-production" \
  postgrest/postgrest
```

## 🚀 Iniciar PostgREST

### Local (Recommended)

```bash
npm start
```

### O manualmente

```bash
postgrest postgrest.conf
```

El servidor estará disponible en: **http://localhost:3000**

## 🗄️ Base de Datos

### Esquema

El esquema SQL está en `sql/schema.sql` (generado desde `schema-docs.md`)

Tablas principales:
- `users` - Usuarios del sistema
- `branches` - Sucursales
- `products` - Catálogo de productos
- `inventory_items` - Inventario físico
- `sales` - Transacciones de venta
- `reservations` - Reservas de clientes
- `credits` - Ventas a crédito
- `general_ledger` - Libro diario
- `expenses` - Gastos

### Crear Base de Datos

```bash
# Conectarse a AWS RDS
psql -h appleland.cbusqiwsy85i.us-east-2.rds.amazonaws.com -U appleladnd -d postgres

# Ejecutar script de schema
\i sql/schema.sql
```

## 📡 API Endpoints

Todos los endpoints se generan automáticamente desde las tablas:

```bash
# Usuarios
GET    /users
POST   /users
GET    /users/{id}
PATCH  /users/{id}
DELETE /users/{id}

# Productos
GET    /products
POST   /products
GET    /products/{id}

# Ventas
GET    /sales
POST   /sales
GET    /sales/{id}

# Reservas
GET    /reservations
POST   /reservations

# Créditos
GET    /credits
POST   /credits

# Sucursales
GET    /branches
POST   /branches
```

## 🔐 Autenticación

PostgREST usa JWT para autenticación. Incluye el token en el header:

```bash
curl -H "Authorization: Bearer {JWT_TOKEN}" http://localhost:3000/users
```

## 📝 Estructura de Carpetas

```
backend/
├── postgrest.conf          # Configuración de PostgREST
├── db-connection.js        # Módulo de conexión a BD
├── package.json            # Dependencias
├── .env.example            # Variables de entorno (plantilla)
├── sql/
│   ├── init.sql           # Inicialización de roles y permisos
│   ├── schema.sql         # Schema completo de la BD
│   └── auth.sql           # Funciones de login JWT en PostgreSQL
├── QUICK_START.md         # Guía rápida de inicio
└── README.md              # Este archivo
```

## 🧪 Testing

### Verificar Conexión a BD

```bash
node db-connection.js
```

### Probar API

```bash
curl http://localhost:3000

curl http://localhost:3000/users

curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com"}'
```

## 🔗 Conectar desde Frontend

En el frontend (React), usa:

```typescript
const API_URL = 'http://localhost:3000';

fetch(`${API_URL}/users`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

## 📚 Documentación

- [PostgREST Docs](https://postgrest.org)
- [AWS RDS Documentation](https://docs.aws.amazon.com/rds/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)

## 🆘 Troubleshooting

### Conexión rechazada a AWS RDS
1. Verificar credenciales en `.env`
2. Verificar security group en AWS permite puerto 5432
3. Verificar VPN/firewall

### Avatar/permisos insuficientes
- Ejecutar `sql/init.sql` nuevamente
- Verificar que el usuario tenga permisos

### PostgREST no inicia
```bash
# Verificar que PostgREST esté instalado
postgrest --version

# Reinstalar si es necesario
# usar binario manual en backend/bin o Docker
```

## 📞 Contacto

Para problemas o preguntas sobre la configuración de AWS RDS, contactar al equipo de DevOps.

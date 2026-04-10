# Fix: JWT Secret + Permisos web_user

Ejecutar en DBeaver conectado a la RDS de AWS.

## 0. Diagnóstico — ver qué secret tiene la DB ahora

```sql
SELECT key, value, updated_at FROM app.private_settings WHERE key = 'jwt_secret';
```

## 0b. Diagnóstico — verificar roles y permisos

```sql
-- Verificar que los roles existen
SELECT rolname, rolcanlogin, rolinherit FROM pg_roles 
WHERE rolname IN ('web_anon', 'web_user', 'appleladnd');

-- Verificar que appleladnd puede cambiar a web_user (SET ROLE)
SELECT r.rolname AS rol_padre, m.rolname AS rol_miembro
FROM pg_auth_members am
JOIN pg_roles r ON r.oid = am.roleid
JOIN pg_roles m ON m.oid = am.member
WHERE m.rolname = 'appleladnd';

-- Verificar permisos directos sobre la tabla users
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'users' AND table_schema = 'public';
```

## 0c. Fix roles si faltan (correr si el diagnóstico muestra que faltan)

```sql
-- Crear roles si no existen
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'web_anon') THEN
    CREATE ROLE web_anon NOLOGIN;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'web_user') THEN
    CREATE ROLE web_user NOLOGIN;
  END IF;
END $$;

-- Dar a appleladnd la capacidad de cambiar a web_anon y web_user
GRANT web_anon TO appleladnd;
GRANT web_user TO appleladnd;
```

## 1. Sincronizar JWT secret

```sql
INSERT INTO app.private_settings (key, value, updated_at)
VALUES ('jwt_secret', 'Pass123AppleLand_SuperSecretKey32!', now())
ON CONFLICT (key) DO UPDATE SET value = 'Pass123AppleLand_SuperSecretKey32!', updated_at = now();
```

## 2. Dar permisos sobre todas las tablas

```sql
GRANT USAGE ON SCHEMA public TO web_anon, web_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO web_anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO web_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO web_user;
```

## 3. Reiniciar PostgREST (en terminal)

```powershell
cd "c:\Users\LOQ\Documents\JOBS\APPLE_LAND\APP\backend"
docker compose down
docker compose up -d
```

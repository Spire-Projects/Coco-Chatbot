-- ============================================
-- Apple Land ERP - PostgREST Initialization
-- ============================================

-- Crear roles necesarios para PostgREST
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'web_anon') THEN
    CREATE ROLE web_anon NOLOGIN;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'web_user') THEN
    CREATE ROLE web_user LOGIN NOINHERIT;
  END IF;
END
$$;

-- Otorgar permisos básicos
GRANT web_anon TO web_user;

-- El usuario de conexión de PostgREST (authenticator) debe poder cambiar a web_anon/web_user
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'appleladnd') THEN
    GRANT web_anon TO appleladnd;
    GRANT web_user TO appleladnd;
  END IF;
END
$$;

-- Crear schema public si no existe
CREATE SCHEMA IF NOT EXISTS public;
CREATE SCHEMA IF NOT EXISTS app;

-- ============================================
-- CONFIGURAR PERMISOS POR TABLA
-- ============================================

-- Permisos para tablas principales (lectura pública)
GRANT USAGE ON SCHEMA public TO web_anon;
GRANT USAGE ON SCHEMA app TO web_anon;
GRANT USAGE ON SCHEMA app TO web_user;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO web_anon;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO web_anon;

-- Permisos para usuarios autenticados (CRUD)
GRANT ALL ON ALL TABLES IN SCHEMA public TO web_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO web_user;

-- Permisos por defecto para futuras tablas
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO web_anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO web_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO web_user;

-- ============================================
-- CREAR FUNCIONES DE AUTENTICACIÓN (Opcional)
-- ============================================

-- Función para obtener usuario actual desde JWT
CREATE OR REPLACE FUNCTION app.current_user_id() RETURNS uuid AS $$
  SELECT nullif(current_setting('request.jwt.claims', true)::json->>'user_id', '')::uuid
$$ STABLE LANGUAGE SQL;

COMMENT ON FUNCTION app.current_user_id() IS 'Obtiene el ID del usuario del JWT actual';

GRANT EXECUTE ON FUNCTION app.current_user_id() TO web_anon;
GRANT EXECUTE ON FUNCTION app.current_user_id() TO web_user;

-- ============================================
-- Mensajes de confirmación
-- ============================================
SELECT 'PostgREST initialization completed successfully!' as message;

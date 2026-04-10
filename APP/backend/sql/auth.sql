-- ============================================
-- Apple Land ERP - Auth Functions for PostgREST
-- ============================================

-- Required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS app;

CREATE TABLE IF NOT EXISTS app.private_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE app.private_settings IS 'Configuraciones privadas internas para auth';

CREATE OR REPLACE FUNCTION app.get_jwt_secret()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app
AS $$
DECLARE
  v_secret text;
BEGIN
  v_secret := current_setting('app.jwt_secret', true);

  IF v_secret IS NULL OR v_secret = '' THEN
    SELECT value
      INTO v_secret
      FROM app.private_settings
     WHERE key = 'jwt_secret';
  END IF;

  RETURN v_secret;
END;
$$;

COMMENT ON FUNCTION app.get_jwt_secret() IS 'Obtiene el JWT secret desde setting o tabla privada';

-- Base64URL encoder helper used for JWT creation
CREATE OR REPLACE FUNCTION app.base64url_encode(p_input bytea)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT replace(replace(translate(encode(p_input, 'base64'), E'+/\n', '-_'), '=', ''), E'\r', '');
$$;

COMMENT ON FUNCTION app.base64url_encode(bytea) IS 'Codifica bytea en Base64URL sin padding';

-- Create HS256 JWT without pgjwt extension (RDS-safe)
CREATE OR REPLACE FUNCTION app.sign_jwt_hs256(p_payload jsonb, p_secret text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_header text := '{"alg":"HS256","typ":"JWT"}';
  v_header_b64 text;
  v_payload_b64 text;
  v_unsigned text;
  v_signature text;
BEGIN
  v_header_b64 := app.base64url_encode(convert_to(v_header, 'utf8'));
  v_payload_b64 := app.base64url_encode(convert_to(p_payload::text, 'utf8'));
  v_unsigned := v_header_b64 || '.' || v_payload_b64;
  v_signature := app.base64url_encode(hmac(v_unsigned, p_secret, 'sha256'));

  RETURN v_unsigned || '.' || v_signature;
END;
$$;

COMMENT ON FUNCTION app.sign_jwt_hs256(jsonb, text) IS 'Firma JWT HS256 usando pgcrypto.hmac';

-- Hash a plain password using bcrypt
CREATE OR REPLACE FUNCTION app.hash_password(p_password text)
RETURNS text
LANGUAGE sql
AS $$
  SELECT crypt(p_password, gen_salt('bf', 12));
$$;

COMMENT ON FUNCTION app.hash_password(text) IS 'Genera hash bcrypt para password';

-- Bootstrap first admin user. Only works when there are no active users yet.
CREATE OR REPLACE FUNCTION app.bootstrap_admin(
  p_name text,
  p_email text,
  p_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app
AS $$
DECLARE
  v_user users%ROWTYPE;
  v_count bigint;
BEGIN
  SELECT count(*) INTO v_count FROM users WHERE is_deleted = false;

  IF v_count > 0 THEN
    RAISE EXCEPTION 'Bootstrap deshabilitado: ya existen usuarios';
  END IF;

  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'Nombre es requerido';
  END IF;

  IF p_email IS NULL OR trim(p_email) = '' THEN
    RAISE EXCEPTION 'Email es requerido';
  END IF;

  IF p_password IS NULL OR length(p_password) < 6 THEN
    RAISE EXCEPTION 'Password debe tener al menos 6 caracteres';
  END IF;

  INSERT INTO users (
    name,
    email,
    password_hash,
    role,
    is_active,
    is_deleted,
    created_at,
    updated_at
  )
  VALUES (
    trim(p_name),
    lower(trim(p_email)),
    app.hash_password(p_password),
    'superadmin',
    true,
    false,
    now(),
    now()
  )
  RETURNING * INTO v_user;

  RETURN jsonb_build_object(
    'id', v_user.id,
    'name', v_user.name,
    'email', v_user.email,
    'role', v_user.role,
    'message', 'Primer usuario admin creado correctamente'
  );
END;
$$;

COMMENT ON FUNCTION app.bootstrap_admin(text, text, text) IS 'Crea el primer superadmin cuando no existen usuarios';

CREATE OR REPLACE FUNCTION public.bootstrap_admin(
  p_name text,
  p_email text,
  p_password text
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, app
AS $$
  SELECT app.bootstrap_admin(p_name, p_email, p_password);
$$;

COMMENT ON FUNCTION public.bootstrap_admin(text, text, text) IS 'Wrapper publico para crear el primer superadmin';

-- Register function exposed through PostgREST RPC: /rpc/register_user
-- Creates users with bcrypt hash on DB side
CREATE OR REPLACE FUNCTION app.register_user(
  p_name text,
  p_email text,
  p_password text,
  p_role user_role DEFAULT 'seller'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app
AS $$
DECLARE
  v_exists boolean;
  v_user users%ROWTYPE;
BEGIN
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'Nombre es requerido';
  END IF;

  IF p_email IS NULL OR trim(p_email) = '' THEN
    RAISE EXCEPTION 'Email es requerido';
  END IF;

  IF p_password IS NULL OR length(p_password) < 6 THEN
    RAISE EXCEPTION 'Password debe tener al menos 6 caracteres';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM users
    WHERE lower(email) = lower(trim(p_email))
  )
  INTO v_exists;

  IF v_exists THEN
    RAISE EXCEPTION 'El email ya esta registrado';
  END IF;

  INSERT INTO users (
    name,
    email,
    password_hash,
    role,
    is_active,
    is_deleted,
    created_at,
    updated_at,
    created_by,
    updated_by
  )
  VALUES (
    trim(p_name),
    lower(trim(p_email)),
    app.hash_password(p_password),
    p_role,
    true,
    false,
    now(),
    now(),
    app.current_user_id(),
    app.current_user_id()
  )
  RETURNING * INTO v_user;

  RETURN jsonb_build_object(
    'id', v_user.id,
    'name', v_user.name,
    'email', v_user.email,
    'role', v_user.role,
    'is_active', v_user.is_active,
    'created_at', v_user.created_at
  );
END;
$$;

COMMENT ON FUNCTION app.register_user(text, text, text, user_role) IS 'Registra usuario con hash bcrypt en DB';

-- Public wrapper so PostgREST can resolve /rpc/register_user in default schema
CREATE OR REPLACE FUNCTION public.register_user(
  p_name text,
  p_email text,
  p_password text,
  p_role user_role DEFAULT 'seller'
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, app
AS $$
  SELECT app.register_user(p_name, p_email, p_password, p_role);
$$;

COMMENT ON FUNCTION public.register_user(text, text, text, user_role) IS 'Wrapper publico para registro de usuario';

-- Login function exposed through PostgREST RPC: /rpc/login
-- Returns JWT + user payload
CREATE OR REPLACE FUNCTION app.login(p_email text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app
AS $$
DECLARE
  v_user users%ROWTYPE;
  v_secret text;
  v_exp bigint;
  v_payload json;
  v_token text;
BEGIN
  SELECT *
    INTO v_user
    FROM users
   WHERE lower(email) = lower(trim(p_email))
     AND is_active = true
     AND is_deleted = false
   LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Credenciales invalidas';
  END IF;

  IF v_user.password_hash IS NULL
     OR v_user.password_hash = ''
     OR crypt(p_password, v_user.password_hash) <> v_user.password_hash THEN
    RAISE EXCEPTION 'Credenciales invalidas';
  END IF;

  v_secret := app.get_jwt_secret();

  IF v_secret IS NULL OR v_secret = '' THEN
    RAISE EXCEPTION 'jwt_secret no esta configurado en app.private_settings';
  END IF;

  v_exp := extract(epoch FROM now() + interval '8 hours')::bigint;

  v_payload := json_build_object(
    'role', 'web_user',
    'user_id', v_user.id,
    'email', v_user.email,
    'name', v_user.name,
    'app_role', v_user.role,
    'exp', v_exp
  );

  SELECT app.sign_jwt_hs256(v_payload::jsonb, v_secret) INTO v_token;

  RETURN jsonb_build_object(
    'token', v_token,
    'token_type', 'Bearer',
    'expires_in', 28800,
    'user', jsonb_build_object(
      'id', v_user.id,
      'name', v_user.name,
      'email', v_user.email,
      'role', v_user.role
    )
  );
END;
$$;

COMMENT ON FUNCTION app.login(text, text) IS 'Valida email/password y retorna JWT firmado';

-- Public wrapper so PostgREST can resolve /rpc/login in default schema
CREATE OR REPLACE FUNCTION public.login(p_email text, p_password text)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, app
AS $$
  SELECT app.login(p_email, p_password);
$$;

COMMENT ON FUNCTION public.login(text, text) IS 'Wrapper publico para login JWT';

REVOKE ALL ON FUNCTION app.hash_password(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.login(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.register_user(text, text, text, user_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.bootstrap_admin(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.base64url_encode(bytea) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.sign_jwt_hs256(jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.get_jwt_secret() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.login(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.register_user(text, text, text, user_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bootstrap_admin(text, text, text) FROM PUBLIC;
REVOKE ALL ON TABLE app.private_settings FROM PUBLIC;

GRANT EXECUTE ON FUNCTION app.hash_password(text) TO web_user;
GRANT EXECUTE ON FUNCTION app.login(text, text) TO web_anon;
GRANT EXECUTE ON FUNCTION app.register_user(text, text, text, user_role) TO web_user;
GRANT EXECUTE ON FUNCTION app.bootstrap_admin(text, text, text) TO web_anon;
GRANT EXECUTE ON FUNCTION app.get_jwt_secret() TO web_anon;
GRANT EXECUTE ON FUNCTION app.get_jwt_secret() TO web_user;
GRANT EXECUTE ON FUNCTION public.login(text, text) TO web_anon;
GRANT EXECUTE ON FUNCTION public.register_user(text, text, text, user_role) TO web_user;
GRANT EXECUTE ON FUNCTION public.bootstrap_admin(text, text, text) TO web_anon;

SELECT 'Auth functions created successfully!' AS message;

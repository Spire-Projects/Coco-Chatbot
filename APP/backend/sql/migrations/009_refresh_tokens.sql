-- MIGRATION 009 — Refresh tokens
--
-- Adds a refresh_tokens table and rpc/refresh_token endpoint so the frontend
-- can obtain a new JWT without requiring the user to log in again.
-- Also updates app.login to return a refresh_token alongside the JWT.

-- ─── Table ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.refresh_tokens (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      text        NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 days',
  created_at timestamptz NOT NULL DEFAULT now(),
  is_revoked boolean     NOT NULL DEFAULT false
);

COMMENT ON TABLE public.refresh_tokens IS 'Tokens de larga duración para renovar JWTs sin re-login';

-- Basic index for fast lookups
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token     ON public.refresh_tokens (token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id   ON public.refresh_tokens (user_id);

-- ─── Helper: create a refresh token for a user ────────────────────────────────

CREATE OR REPLACE FUNCTION app.create_refresh_token(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app
AS $$
DECLARE
  v_token text;
BEGIN
  v_token := encode(gen_random_bytes(32), 'hex');
  INSERT INTO refresh_tokens (user_id, token) VALUES (p_user_id, v_token);
  RETURN v_token;
END;
$$;

COMMENT ON FUNCTION app.create_refresh_token(uuid) IS 'Genera y persiste un refresh token para un usuario';

-- ─── Update app.login to return refresh_token too ─────────────────────────────

CREATE OR REPLACE FUNCTION app.login(p_email text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app
AS $$
DECLARE
  v_user           users%ROWTYPE;
  v_secret         text;
  v_exp            bigint;
  v_payload        json;
  v_token          text;
  v_refresh_token  text;
BEGIN
  SELECT *
    INTO v_user
    FROM users
   WHERE lower(email) = lower(trim(p_email))
     AND is_active  = true
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
    'role',     'web_user',
    'user_id',  v_user.id,
    'email',    v_user.email,
    'name',     v_user.name,
    'app_role', v_user.role,
    'exp',      v_exp
  );

  SELECT app.sign_jwt_hs256(v_payload::jsonb, v_secret) INTO v_token;

  v_refresh_token := app.create_refresh_token(v_user.id);

  RETURN jsonb_build_object(
    'token',         v_token,
    'token_type',    'Bearer',
    'expires_in',    28800,
    'refresh_token', v_refresh_token,
    'user', jsonb_build_object(
      'id',    v_user.id,
      'name',  v_user.name,
      'email', v_user.email,
      'role',  v_user.role
    )
  );
END;
$$;

COMMENT ON FUNCTION app.login(text, text) IS 'Valida email/password y retorna JWT + refresh token';

-- ─── RPC: refresh_token ───────────────────────────────────────────────────────
-- Called with skipAuth=true; the refresh token itself identifies the session.

CREATE OR REPLACE FUNCTION app.refresh_token(p_refresh_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app
AS $$
DECLARE
  v_rt             refresh_tokens%ROWTYPE;
  v_user           users%ROWTYPE;
  v_secret         text;
  v_exp            bigint;
  v_payload        json;
  v_new_token      text;
  v_new_refresh    text;
BEGIN
  -- Validate: token must exist, not revoked, not expired
  SELECT *
    INTO v_rt
    FROM refresh_tokens
   WHERE token      = p_refresh_token
     AND is_revoked = false
     AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Refresh token invalido o expirado';
  END IF;

  -- User must still be active
  SELECT *
    INTO v_user
    FROM users
   WHERE id         = v_rt.user_id
     AND is_active  = true
     AND is_deleted = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario no encontrado o inactivo';
  END IF;

  -- Revoke used token (rotation — prevents reuse)
  UPDATE refresh_tokens SET is_revoked = true WHERE id = v_rt.id;

  -- Issue new JWT
  v_secret := app.get_jwt_secret();
  v_exp    := extract(epoch FROM now() + interval '8 hours')::bigint;

  v_payload := json_build_object(
    'role',     'web_user',
    'user_id',  v_user.id,
    'email',    v_user.email,
    'name',     v_user.name,
    'app_role', v_user.role,
    'exp',      v_exp
  );

  SELECT app.sign_jwt_hs256(v_payload::jsonb, v_secret) INTO v_new_token;

  -- Issue new refresh token (rotation)
  v_new_refresh := app.create_refresh_token(v_user.id);

  RETURN jsonb_build_object(
    'token',         v_new_token,
    'token_type',    'Bearer',
    'expires_in',    28800,
    'refresh_token', v_new_refresh,
    'user', jsonb_build_object(
      'id',    v_user.id,
      'name',  v_user.name,
      'email', v_user.email,
      'role',  v_user.role
    )
  );
END;
$$;

COMMENT ON FUNCTION app.refresh_token(text) IS 'Rota el refresh token y emite un nuevo JWT';

-- Public wrapper
CREATE OR REPLACE FUNCTION public.refresh_token(p_refresh_token text)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, app
AS $$
  SELECT app.refresh_token(p_refresh_token);
$$;

COMMENT ON FUNCTION public.refresh_token(text) IS 'Wrapper publico para renovar JWT via refresh token';

-- ─── Permissions ──────────────────────────────────────────────────────────────

REVOKE ALL ON TABLE public.refresh_tokens             FROM PUBLIC;
REVOKE ALL ON FUNCTION app.create_refresh_token(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.refresh_token(text)        FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refresh_token(text)     FROM PUBLIC;

-- web_anon can call refresh_token (no JWT needed, just the refresh token)
GRANT EXECUTE ON FUNCTION public.refresh_token(text) TO web_anon;
GRANT EXECUTE ON FUNCTION app.refresh_token(text)    TO web_anon;

-- web_user retains login capability (already granted above, but be explicit)
GRANT EXECUTE ON FUNCTION public.login(text, text)   TO web_anon;

-- Internal grants
GRANT SELECT, INSERT, UPDATE ON TABLE public.refresh_tokens TO web_user;

SELECT '009 — refresh_tokens migration applied successfully' AS message;

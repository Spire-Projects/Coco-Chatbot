-- ============================================================
-- Migration 007 — clients table
-- ============================================================
-- Creates the clients table for managing customer contacts.

CREATE TABLE IF NOT EXISTS public.clients (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL,
    email       TEXT,
    phone       TEXT,
    address     TEXT,
    created_at  TIMESTAMPTZ DEFAULT now(),
    created_by  UUID        REFERENCES public.users(id),
    updated_at  TIMESTAMPTZ DEFAULT now(),
    updated_by  UUID        REFERENCES public.users(id),
    is_deleted  BOOLEAN     DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_is_deleted ON public.clients(is_deleted);

-- Grant access to PostgREST roles
GRANT SELECT ON public.clients TO web_anon;
GRANT ALL    ON public.clients TO web_user;

SELECT 'Migration 007 — clients table created' AS message;

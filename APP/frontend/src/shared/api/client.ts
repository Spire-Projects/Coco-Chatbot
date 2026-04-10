import { config } from '../config/config';

const TOKEN_KEY = config.TOKEN.STORAGE_KEY;
const REFRESH_TOKEN_KEY = `${TOKEN_KEY}_refresh`;

function getApiBaseUrl(): string {
  const baseUrl = config.API.BASE_URL?.trim();

  if (!baseUrl || baseUrl === 'undefined') {
    throw new Error('VITE_API_URL is not defined. Configure the PostgREST base URL in frontend/.env.');
  }

  return baseUrl.replace(/\/$/, '');
}

/** Obtiene el token JWT almacenado */
export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/** Obtiene el refresh token almacenado */
export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/** Guarda el token JWT en localStorage */
export function storeAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  console.debug('[auth] Token almacenado en localStorage ✅', `${token.slice(0, 20)}…`);
}

/** Guarda el refresh token en localStorage */
export function storeRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

/** Elimina el token JWT del localStorage */
export function removeAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem('falcon_user');
  console.debug('[auth] Token eliminado de localStorage');
}

/**
 * Callback que se ejecuta cuando el refresh falla y la sesión debe cerrarse.
 * Regístrar via setUnauthorizedHandler() en App.tsx o authStore.
 */
let _unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void): void {
  _unauthorizedHandler = handler;
}

/**
 * Intenta renovar el JWT usando el refresh token almacenado.
 * Retorna el nuevo JWT si tiene éxito, null si falla.
 */
async function tryRefreshToken(): Promise<string | null> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return null;

  const baseUrl = getApiBaseUrl();

  try {
    const res = await fetch(`${baseUrl}/rpc/refresh_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_refresh_token: refreshToken }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data?.token) return null;

    storeAuthToken(data.token);
    if (data.refresh_token) storeRefreshToken(data.refresh_token);
    console.debug('[auth] JWT renovado via refresh token ✅');
    return data.token as string;
  } catch {
    return null;
  }
}

/**
 * Executes a raw fetch to PostgREST with auth headers and one refresh retry on 401.
 * Useful when callers need direct access to Response headers (e.g., Content-Range).
 */
export async function fetchWithAuthRetry(
  path: string,
  options: RequestInit & { headers?: HeadersInit; skipAuth?: boolean; _isRetry?: boolean } = {}
): Promise<Response> {
  const baseUrl = getApiBaseUrl();
  const { skipAuth, _isRetry, ...fetchOptions } = options;
  const token = skipAuth ? null : getStoredToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const extraHeaders = new Headers(options.headers ?? {});
  extraHeaders.forEach((value, key) => {
    headers[key] = value;
  });

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${baseUrl}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (res.status === 401 && !skipAuth && !_isRetry) {
    console.debug('[auth] 401 detectado en fetchWithAuthRetry — intentando renovar JWT…');
    const newToken = await tryRefreshToken();
    if (newToken) {
      return fetchWithAuthRetry(path, { ...options, _isRetry: true });
    }
    console.warn('[auth] Refresh fallido en fetchWithAuthRetry — cerrando sesión');
    removeAuthToken();
    _unauthorizedHandler?.();
  }

  return res;
}

/**
 * Wrapper base para llamadas a PostgREST.
 * Inyecta automáticamente el Bearer token y headers comunes.
 * @param skipAuth — si true, no adjunta el Authorization header (útil para /rpc/login)
 */
export async function pgFetch<T>(
  path: string,
  options: RequestInit & { headers?: HeadersInit; skipAuth?: boolean; _isRetry?: boolean } = {}
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const { skipAuth, _isRetry, ...fetchOptions } = options;
  const token = skipAuth ? null : getStoredToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };

  const extraHeaders = new Headers(options.headers ?? {});
  extraHeaders.forEach((value, key) => {
    headers[key] = value;
  });

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    console.debug(`[pgFetch] ${fetchOptions.method ?? 'GET'} ${path} | token: ${token.slice(0, 20)}…`);
  } else {
    console.debug(`[pgFetch] ${fetchOptions.method ?? 'GET'} ${path} | sin token${skipAuth ? ' (skipAuth)' : ''}`);
  }

  const res = await fetch(`${baseUrl}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (!res.ok) {
    // Handle 401: attempt token refresh once, then retry
    if (res.status === 401 && !skipAuth && !_isRetry) {
      console.debug('[auth] 401 detectado — intentando renovar JWT…');
      const newToken = await tryRefreshToken();
      if (newToken) {
        return pgFetch<T>(path, { ...options, _isRetry: true });
      }
      // Refresh also failed: end the session
      console.warn('[auth] Refresh fallido — cerrando sesión');
      removeAuthToken();
      _unauthorizedHandler?.();
    }
    const errorBody = await res.json().catch(() => ({ message: res.statusText }));
    throw errorBody;
  }

  // 204 No Content
  if (res.status === 204) {
    return undefined as unknown as T;
  }

  return res.json() as Promise<T>;
}

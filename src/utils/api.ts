const API_BASE = import.meta.env.VITE_API_URL || '';

/** Builds Authorization header from stored JWT token */
export function getAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  const token = localStorage.getItem('xia_auth_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Core fetch wrapper for Xia Chat API.
 * - Adds Bearer token automatically
 * - Applies a 10-second AbortController timeout
 * - Intercepts 401 responses → clears auth token → redirects to /login
 */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('xia_auth_token');
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;

  // 10-second request timeout via AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
      signal: controller.signal,
    });
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  // Auto-logout on 401 — token is expired or invalid
  if (response.status === 401) {
    localStorage.removeItem('xia_auth_token');
    // Only redirect if not already on an auth route
    const authRoutes = ['/login', '/signup', '/forgot-password', '/reset-password', '/set-password'];
    if (!authRoutes.includes(window.location.pathname)) {
      window.history.pushState({}, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }

  return response;
}

/**
 * Typed JSON fetch helper.
 * Throws a typed Error with the server's `error` message on non-2xx responses.
 */
export async function apiJSON<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  if (!options.headers) {
    const h = new Headers();
    h.set('Content-Type', 'application/json');
    options = { ...options, headers: h };
  } else {
    const h = new Headers(options.headers);
    if (!h.has('Content-Type')) h.set('Content-Type', 'application/json');
    options = { ...options, headers: h };
  }

  const res = await apiFetch(path, options);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = (data as { error?: string }).error || `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return data as T;
}

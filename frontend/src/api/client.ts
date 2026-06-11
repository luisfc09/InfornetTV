// Cliente HTTP do backend InfornetTV. Centraliza base URL, token e parsing
// do envelope APIResponse.

import type { APIResponse, AuthResult, Content, ContentList } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
const TOKEN_KEY = 'infornet_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const body = (await res.json()) as APIResponse<T>;

  if (!res.ok || !body.success) {
    throw new Error(body.error ?? `Erro HTTP ${res.status}`);
  }
  return body.data as T;
}

export const api = {
  // ── Auth ──────────────────────────────────────────────────────────────
  register: (email: string, password: string, cpf?: string) =>
    request<AuthResult>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, cpf }),
    }),

  login: (email: string, password: string) =>
    request<AuthResult>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  // ── Catálogo ──────────────────────────────────────────────────────────
  getContent: (params?: { genre?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.genre) q.set('genre', params.genre);
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return request<ContentList>(`/api/content${qs ? `?${qs}` : ''}`);
  },

  getTrending: (limit = 20) =>
    request<ContentList>(`/api/content/trending?limit=${limit}`),

  search: (term: string) =>
    request<ContentList>(`/api/content/search?q=${encodeURIComponent(term)}`),

  getDetail: (id: string) => request<Content>(`/api/content/${id}`),
};

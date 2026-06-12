import { useCallback, useEffect, useState } from 'react';
import type { APIResponse } from '../types';

// Em dev aponta ao backend local (:3001); em produção o backend serve a própria
// SPA, então a API é same-origin (BASE_URL vazio → caminhos relativos).
export const BASE_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? 'http://localhost:3001' : '');

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook genérico de leitura da API InfornetTV. Recebe um path (ex.:
 * "/api/content?limit=50"), trata o envelope APIResponse e expõe
 * { data, loading, error, refetch }.
 */
export function useApi<T>(path: string): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}${path}`);
      const body = (await res.json()) as APIResponse<T>;
      if (!res.ok || !body.success) {
        throw new Error(body.error ?? `Erro HTTP ${res.status}`);
      }
      setData(body.data as T);
    } catch (e) {
      setError((e as Error).message ?? 'Falha ao carregar');
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refetch: load };
}

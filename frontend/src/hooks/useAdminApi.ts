// Helper para chamar /api/admin/** com o token de admin.

import { useState, useCallback } from 'react';
import { useAdminAuth } from './useAdminAuth';
import { BASE_URL } from './useApi';

export function useAdminApi() {
  const { token } = useAdminAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(
    async (endpoint: string, options: RequestInit = {}) => {
      if (!token) throw new Error('Não autenticado como admin');

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${BASE_URL}/api/admin${endpoint}`, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...options.headers,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || `Erro: ${response.status}`);
        }

        return data.data;
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Erro desconhecido';
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  return { request, loading, error };
}

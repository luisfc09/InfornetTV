// Autenticação do Admin Panel — SEPARADA do auth de usuários do app.
// Token e usuário admin ficam em chaves próprias do localStorage
// (admin_token/admin_user) e falam com /api/admin/auth/**.

import {
  createContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { BASE_URL } from '../hooks/useApi';

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  permissions: string[];
}

interface AdminAuthContextType {
  admin: AdminUser | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  changePassword: (newPassword: string) => Promise<void>;
}

export const AdminAuthContext = createContext<AdminAuthContextType | undefined>(
  undefined,
);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(() => {
    const stored = localStorage.getItem('admin_user');
    return stored ? JSON.parse(stored) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('admin_token');
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BASE_URL}/api/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao fazer login');
      }

      setToken(data.data.token);
      setAdmin(data.data.admin);

      // Salva no localStorage
      localStorage.setItem('admin_token', data.data.token);
      localStorage.setItem('admin_user', JSON.stringify(data.data.admin));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setAdmin(null);
    setToken(null);
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
  }, []);

  const changePassword = useCallback(
    async (newPassword: string) => {
      if (!token) throw new Error('Não autenticado');

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${BASE_URL}/api/admin/auth/change-password`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ newPassword }),
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Falha ao alterar senha');
        }
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

  return (
    <AdminAuthContext.Provider
      value={{ admin, token, loading, error, login, logout, changePassword }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

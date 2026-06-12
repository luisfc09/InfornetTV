// Autenticação do ASSINANTE (app de streaming) — separada da de admin.
// Token/usuário em infornet_user_token / infornet_user no localStorage.

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { BASE_URL } from '../hooks/useApi';

export interface AppUser {
  id: string;
  email: string;
  tier: 'free' | 'premium';
  subscription_active: boolean;
}

interface UserAuthContextType {
  user: AppUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const UserAuthContext = createContext<UserAuthContextType | undefined>(
  undefined,
);

const TOKEN_KEY = 'infornet_user_token';
const USER_KEY = 'infornet_user';

export function UserAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AppUser) : null;
  });
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY),
  );
  const [loading, setLoading] = useState(false);

  const authCall = useCallback(
    async (path: string, email: string, password: string) => {
      setLoading(true);
      try {
        const res = await fetch(`${BASE_URL}${path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const body = await res.json();
        if (!res.ok || !body.success) {
          throw new Error(body.error ?? `Erro HTTP ${res.status}`);
        }
        const { token: t, user: u } = body.data;
        localStorage.setItem(TOKEN_KEY, t);
        localStorage.setItem(USER_KEY, JSON.stringify(u));
        setToken(t);
        setUser(u);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const login = useCallback(
    (email: string, password: string) =>
      authCall('/api/auth/login', email, password),
    [authCall],
  );
  const register = useCallback(
    (email: string, password: string) =>
      authCall('/api/auth/register', email, password),
    [authCall],
  );
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <UserAuthContext.Provider
      value={{ user, token, loading, login, register, logout }}
    >
      {children}
    </UserAuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUserAuth(): UserAuthContextType {
  const ctx = useContext(UserAuthContext);
  if (!ctx)
    throw new Error('useUserAuth deve ser usado dentro de UserAuthProvider');
  return ctx;
}

import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUserAuth } from '../contexts/UserAuthContext';

export function Login() {
  const { login, loading } = useUserAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="grid min-h-[80vh] place-items-center px-4 pt-[60px]">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-xl border border-white/10 bg-neutral-900/80 p-8"
      >
        <h1 className="mb-6 text-2xl font-bold">Entrar</h1>
        {error && (
          <div className="mb-4 rounded border border-accent bg-accent/15 px-3 py-2 text-sm">
            {error}
          </div>
        )}
        <label className="mb-4 block text-sm text-muted">
          E-mail
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 w-full rounded-md border border-white/10 bg-bg px-3 py-2.5 text-white outline-none focus:border-accent"
          />
        </label>
        <label className="mb-6 block text-sm text-muted">
          Senha
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 w-full rounded-md border border-white/10 bg-bg px-3 py-2.5 text-white outline-none focus:border-accent"
          />
        </label>
        <button
          disabled={loading}
          className="w-full rounded bg-accent py-2.5 font-bold text-white transition hover:bg-accent-hover disabled:opacity-60"
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
        <p className="mt-5 text-center text-sm text-muted">
          Não tem conta?{' '}
          <Link to="/register" className="font-semibold text-white">
            Criar conta
          </Link>
        </p>
      </form>
    </div>
  );
}

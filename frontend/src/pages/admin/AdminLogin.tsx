import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { Lock, Mail } from 'lucide-react';

export default function AdminLogin() {
  const { admin, token, login, loading, error } = useAdminAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin@infornetv.com.br');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  // Se já logado, redireciona pro dashboard
  useEffect(() => {
    if (admin && token) {
      navigate('/admin/dashboard');
    }
  }, [admin, token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    try {
      await login(email, password);
      navigate('/admin/dashboard');
    } catch (err) {
      setLocalError((err as Error).message || 'Falha ao fazer login');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">📺 Infornet TV</h1>
          <h2 className="text-xl text-gray-400">Painel de Administração</h2>
        </div>

        {/* Card */}
        <div className="bg-gray-800 bg-opacity-50 backdrop-blur-md rounded-xl p-8 border border-gray-700">
          {/* Error */}
          {(error || localError) && (
            <div className="mb-6 p-4 bg-red-900 bg-opacity-50 border border-red-700 rounded-lg">
              <p className="text-red-200 text-sm">{error || localError}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-700 bg-opacity-50 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-red-600 focus:bg-opacity-80 transition"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-700 bg-opacity-50 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-red-600 focus:bg-opacity-80 transition"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-gray-500 text-xs mt-6">
            Acesso restrito a administradores
          </p>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { useAdminApi } from '../../hooks/useAdminApi';
import { Trash2, Loader } from 'lucide-react';

interface User {
  id: string;
  email: string;
  cpf?: string;
  tier: string;
  subscription_active: boolean;
  created_at: string;
}

export default function UsersTab() {
  const { request, loading } = useAdminApi();
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState('');
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);

  const loadUsers = useCallback(async () => {
    try {
      const data = await request(`/users?limit=${limit}&offset=${offset}`);
      setUsers(data.items);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [request, limit, offset]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const deleteUser = async (userId: string) => {
    if (!window.confirm('Tem certeza que deseja desativar este usuário?'))
      return;

    try {
      await request(`/users/${userId}`, { method: 'DELETE' });
      loadUsers();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-6 p-4 bg-red-900 bg-opacity-50 border border-red-700 rounded-lg">
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-700">
            <tr>
              <th className="px-6 py-3 text-gray-300 font-semibold">Email</th>
              <th className="px-6 py-3 text-gray-300 font-semibold">CPF</th>
              <th className="px-6 py-3 text-gray-300 font-semibold">Plano</th>
              <th className="px-6 py-3 text-gray-300 font-semibold">Status</th>
              <th className="px-6 py-3 text-gray-300 font-semibold">
                Criado em
              </th>
              <th className="px-6 py-3 text-gray-300 font-semibold">Ação</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="border-b border-gray-700 hover:bg-gray-800 bg-opacity-30"
              >
                <td className="px-6 py-4 text-white">{user.email}</td>
                <td className="px-6 py-4 text-gray-400">{user.cpf || '-'}</td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold ${
                      user.tier === 'premium'
                        ? 'bg-yellow-900 bg-opacity-50 text-yellow-200'
                        : 'bg-gray-700 bg-opacity-50 text-gray-300'
                    }`}
                  >
                    {user.tier.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {user.subscription_active ? (
                    <span className="px-2 py-1 rounded text-xs font-bold bg-green-900 bg-opacity-50 text-green-200">
                      Ativo
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded text-xs font-bold bg-red-900 bg-opacity-50 text-red-200">
                      Inativo
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-gray-400">
                  {new Date(user.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => deleteUser(user.id)}
                    disabled={loading}
                    aria-label={`Desativar ${user.email}`}
                    className="p-2 rounded-lg bg-red-900 bg-opacity-50 hover:bg-opacity-70 text-red-200 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex gap-4 mt-6 justify-center">
        <button
          onClick={() => setOffset(Math.max(0, offset - limit))}
          disabled={offset === 0}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white rounded-lg transition"
        >
          ← Anterior
        </button>
        <button
          onClick={() => setOffset(offset + limit)}
          disabled={users.length < limit}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white rounded-lg transition"
        >
          Próximo →
        </button>
      </div>
    </div>
  );
}

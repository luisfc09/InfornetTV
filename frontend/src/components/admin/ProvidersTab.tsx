import { useEffect, useState, useCallback } from 'react';
import { useAdminApi } from '../../hooks/useAdminApi';
import { Edit2, Power, Loader } from 'lucide-react';
import ProviderEditModal, { type ProviderForm } from './ProviderEditModal';

interface Provider {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  api_base_url: string;
  priority: number;
  is_active: boolean;
}

export default function ProvidersTab() {
  const { request, loading } = useAdminApi();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Provider | null>(null);

  const loadProviders = useCallback(async () => {
    try {
      const data = await request('/providers');
      setProviders(data);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [request]);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const saveProvider = async (form: ProviderForm) => {
    await request(`/providers/${form.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        display_name: form.display_name,
        description: form.description,
        api_base_url: form.api_base_url,
        priority: form.priority,
      }),
    });
    await loadProviders();
  };

  const toggleProvider = async (id: string, isActive: boolean) => {
    try {
      await request(`/providers/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !isActive }),
      });
      loadProviders();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (loading && providers.length === 0) {
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

      <div className="grid gap-4">
        {providers.map((provider) => (
          <div
            key={provider.id}
            className="bg-gray-800 bg-opacity-50 border border-gray-700 rounded-lg p-6 flex items-center justify-between hover:border-gray-600 transition"
          >
            <div>
              <h3 className="text-lg font-bold text-white">
                {provider.display_name}
              </h3>
              <p className="text-gray-400 text-sm">
                Prioridade:{' '}
                <span className="text-red-400">#{provider.priority}</span>
              </p>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => toggleProvider(provider.id, provider.is_active)}
                disabled={loading}
                aria-label={
                  provider.is_active
                    ? `Desativar ${provider.display_name}`
                    : `Ativar ${provider.display_name}`
                }
                className={`p-2 rounded-lg transition ${
                  provider.is_active
                    ? 'bg-green-900 bg-opacity-50 text-green-200 hover:bg-opacity-70'
                    : 'bg-gray-700 bg-opacity-50 text-gray-400 hover:bg-opacity-70'
                }`}
              >
                <Power className="w-5 h-5" />
              </button>

              <button
                onClick={() => setEditing(provider)}
                aria-label={`Editar ${provider.display_name}`}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <ProviderEditModal
          provider={editing}
          onSave={saveProvider}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

// Módulo de integração do provedor: configura credenciais (Mock/Xtream),
// testa a conexão e importa o catálogo VOD real.

import { useState } from 'react';
import { useAdminApi } from '../../hooks/useAdminApi';
import { X, Loader, PlugZap, Download, CheckCircle2, XCircle } from 'lucide-react';

interface ProviderLite {
  id: string;
  display_name: string;
  integration_type?: string;
  has_credentials?: boolean;
  api_base_url?: string;
}

interface TestResult {
  ok: boolean;
  type: string;
  status?: string;
  expiresAt?: string | null;
  activeConnections?: number;
  maxConnections?: number;
  message?: string;
}

export default function ProviderIntegrationModal({
  provider,
  onClose,
  onImported,
}: {
  provider: ProviderLite;
  onClose: () => void;
  onImported: () => void;
}) {
  const { request } = useAdminApi();
  const [type, setType] = useState<'mock' | 'xtream'>(
    (provider.integration_type as 'mock' | 'xtream') ?? 'mock',
  );
  const [baseUrl, setBaseUrl] = useState(provider.api_base_url ?? '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [limit, setLimit] = useState(200);

  const [busy, setBusy] = useState<'' | 'save' | 'test' | 'import'>('');
  const [error, setError] = useState('');
  const [test, setTest] = useState<TestResult | null>(null);
  const [imported, setImported] = useState<string | null>(null);

  const input =
    'w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-red-600';

  const save = async () => {
    setBusy('save');
    setError('');
    try {
      await request(`/providers/${provider.id}/integration`, {
        method: 'PUT',
        body: JSON.stringify({
          type,
          api_base_url: baseUrl,
          username: username || undefined,
          password: password || undefined,
          config: { import_limit: limit },
        }),
      });
      setPassword('');
      setUsername('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  };

  const runTest = async () => {
    setBusy('test');
    setError('');
    setTest(null);
    try {
      setTest(await request(`/providers/${provider.id}/test`, { method: 'POST' }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  };

  const runImport = async () => {
    setBusy('import');
    setError('');
    setImported(null);
    try {
      const r = await request(`/providers/${provider.id}/import`, {
        method: 'POST',
        body: JSON.stringify({ limit }),
      });
      setImported(
        `${r.imported} títulos importados (de ${r.total_no_painel} no painel${r.truncado ? ', limitado' : ''}).`,
      );
      onImported();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Integração ${provider.display_name}`}
    >
      <div className="w-full max-w-lg rounded-xl border border-gray-700 bg-gray-800 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-white">
            <PlugZap className="h-5 w-5 text-red-500" />
            Integração — {provider.display_name}
          </h3>
          <button onClick={onClose} aria-label="Fechar" className="rounded p-1 text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-700 bg-red-900/50 p-3 text-xs text-red-200">
            {error}
          </div>
        )}

        <label className="mb-3 block text-xs font-medium text-gray-300">
          Tipo de integração
          <select
            className={`mt-1 ${input}`}
            value={type}
            onChange={(e) => setType(e.target.value as 'mock' | 'xtream')}
          >
            <option value="mock">Mock (stream de teste)</option>
            <option value="xtream">Xtream Codes / IPTV</option>
          </select>
        </label>

        {type === 'xtream' && (
          <>
            <label className="mb-3 block text-xs font-medium text-gray-300">
              Base URL do painel (ex.: http://host:porta)
              <input
                className={`mt-1 ${input}`}
                placeholder="http://seu-painel.com:8080"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
            </label>
            <div className="mb-3 grid grid-cols-2 gap-3">
              <label className="block text-xs font-medium text-gray-300">
                Usuário
                <input
                  className={`mt-1 ${input}`}
                  autoComplete="off"
                  placeholder={provider.has_credentials ? '•••• (manter)' : ''}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </label>
              <label className="block text-xs font-medium text-gray-300">
                Senha
                <input
                  type="password"
                  className={`mt-1 ${input}`}
                  autoComplete="new-password"
                  placeholder={provider.has_credentials ? '•••• (manter)' : ''}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
            </div>
            <label className="mb-4 block text-xs font-medium text-gray-300">
              Máx. de títulos a importar
              <input
                type="number"
                min={1}
                max={1000}
                className={`mt-1 ${input}`}
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
              />
            </label>
          </>
        )}

        {test && (
          <div
            className={`mb-4 rounded-lg border p-3 text-xs ${
              test.ok
                ? 'border-green-700/60 bg-green-900/30 text-green-200'
                : 'border-yellow-700/60 bg-yellow-900/30 text-yellow-200'
            }`}
          >
            <div className="flex items-center gap-2 font-semibold">
              {test.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {test.message}
            </div>
            {test.type === 'xtream' && (
              <div className="mt-1 text-gray-300">
                status: {test.status} · expira:{' '}
                {test.expiresAt
                  ? new Date(test.expiresAt).toLocaleDateString('pt-BR')
                  : 'ilimitado'}{' '}
                · conexões: {test.activeConnections}/{test.maxConnections}
              </div>
            )}
          </div>
        )}

        {imported && (
          <div className="mb-4 rounded-lg border border-green-700/60 bg-green-900/30 p-3 text-xs text-green-200">
            ✅ {imported}
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <button
            onClick={runTest}
            disabled={busy !== '' || type !== 'xtream'}
            className="flex items-center gap-2 rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600 disabled:opacity-50"
          >
            {busy === 'test' ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <PlugZap className="h-3.5 w-3.5" />}
            Testar conexão
          </button>
          <button
            onClick={runImport}
            disabled={busy !== '' || type !== 'xtream'}
            className="flex items-center gap-2 rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600 disabled:opacity-50"
          >
            {busy === 'import' ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Importar catálogo
          </button>
          <button
            onClick={save}
            disabled={busy !== ''}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {busy === 'save' && <Loader className="h-3.5 w-3.5 animate-spin" />}
            Salvar
          </button>
        </div>
        <p className="mt-3 text-[11px] text-gray-500">
          Credenciais ficam criptografadas no servidor (defina ENCRYPTION_KEY).
          A URL do stream é montada no backend e nunca exposta no catálogo.
        </p>
      </div>
    </div>
  );
}

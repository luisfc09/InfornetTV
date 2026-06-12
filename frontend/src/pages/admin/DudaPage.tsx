// Duda — a IA de retenção da Infornet TV. Monitora o consumo de cada
// assinante e gera recomendações personalizadas (exibidas no app do cliente).

import { useEffect, useState, useCallback } from 'react';
import { useAdminApi } from '../../hooks/useAdminApi';
import { Sparkles, Play, Loader, Clock, Film } from 'lucide-react';

interface DudaInsights {
  resumo: { usuarios_monitorados: number; recomendacoes_ativas: number };
  items: {
    id: string;
    email: string;
    ultimo_acesso: string | null;
    tempo_total_min: number;
    titulo_mais_assistido: string | null;
    generos_favoritos: string[];
    recomendacoes: string[];
  }[];
}

const fmtMin = (min: number) =>
  min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}min` : `${min}min`;

export default function DudaPage() {
  const { request } = useAdminApi();
  const [insights, setInsights] = useState<DudaInsights | null>(null);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setInsights(await request('/duda/insights'));
    } catch (err) {
      setError((err as Error).message);
    }
  }, [request]);

  useEffect(() => {
    load();
  }, [load]);

  const runDuda = async () => {
    setRunning(true);
    setError('');
    try {
      const result = await request('/duda/run', { method: 'POST' });
      setLastRun(
        `${result.usuarios_processados} assinantes processados · ${result.recomendacoes_geradas} recomendações geradas`,
      );
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div>
      {/* Header da Duda */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-purple-600 to-fuchsia-600 text-white shadow-lg">
            <Sparkles className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Duda</h2>
            <p className="text-sm text-gray-400">
              IA de retenção — monitora o que cada assinante assiste e
              recomenda títulos na conta dele
            </p>
          </div>
        </div>

        <button
          onClick={runDuda}
          disabled={running}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-fuchsia-600 px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {running ? (
            <Loader className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {running ? 'Analisando…' : 'Rodar Duda agora'}
        </button>
      </div>

      {lastRun && (
        <div className="mb-4 rounded-lg border border-purple-700/50 bg-purple-900/30 p-3 text-sm text-purple-200">
          ✨ {lastRun}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-red-700 bg-red-900/50 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {!insights ? (
        <div className="flex items-center justify-center py-24">
          <Loader className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      ) : (
        <>
          {/* Resumo */}
          <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
              <p className="text-xs text-gray-400">Assinantes monitorados</p>
              <p className="text-2xl font-bold text-white">
                {insights.resumo.usuarios_monitorados}
              </p>
            </div>
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
              <p className="text-xs text-gray-400">Recomendações ativas</p>
              <p className="text-2xl font-bold text-white">
                {insights.resumo.recomendacoes_ativas}
              </p>
            </div>
          </div>

          {/* Por assinante */}
          <div className="grid gap-4">
            {insights.items.map((u) => (
              <div
                key={u.id}
                className="rounded-lg border border-gray-700 bg-gray-800/50 p-5"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-white">{u.email}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {fmtMin(u.tempo_total_min)} na plataforma
                    </span>
                    {u.ultimo_acesso && (
                      <span>
                        último acesso{' '}
                        {new Date(u.ultimo_acesso).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <p className="text-xs text-gray-500">Mais assistido</p>
                    <p className="flex items-center gap-1.5 text-sm text-gray-200">
                      <Film className="h-3.5 w-3.5 text-gray-500" />
                      {u.titulo_mais_assistido ?? '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Gêneros favoritos</p>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {u.generos_favoritos.map((g) => (
                        <span
                          key={g}
                          className="rounded-full bg-gray-700/70 px-2 py-0.5 text-xs text-gray-300"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">
                      ✨ Duda recomendou (aparece na conta dele)
                    </p>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {u.recomendacoes.length ? (
                        u.recomendacoes.map((title) => (
                          <span
                            key={title}
                            className="rounded-full bg-purple-900/40 px-2 py-0.5 text-xs text-purple-200 ring-1 ring-purple-700/40"
                          >
                            {title}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-500">
                          rode a Duda para gerar
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
